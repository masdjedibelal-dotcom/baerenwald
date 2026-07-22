"use server";

import { revalidatePath } from "next/cache";

import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import {
  MAIL_PDF_LINK_TTL_SEC,
  sendPartnerInternalRechnungMail,
} from "@/lib/partner/partner-mail";
import {
  PARTNER_MAX_HW_UNTERLAGEN_GESAMT,
  parseHwAnhangStoragePaths,
} from "@/lib/partner/partner-hw-dokument-typen";
import { validatePartnerAngebotFiles } from "@/lib/partner/partner-upload-limits";
import {
  resolvePartnerFileUrl,
  uploadPartnerAngebotPdfs,
  uploadPartnerPdf,
} from "@/lib/partner/partner-storage";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export type PartnerAngebotSubmitResult =
  | { ok: true }
  | { ok: false; error: string };

export async function submitPartnerAngebotPdf(
  formData: FormData
): Promise<PartnerAngebotSubmitResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Datenbank nicht konfiguriert." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false, error: "Nicht angemeldet." };
  }

  const link = await linkPortalHandwerkerToAuthUser({
    userId: user.id,
    email: user.email,
  });

  if (!link.ok) {
    return { ok: false, error: link.error };
  }

  const anfrageId = String(formData.get("anfrageId") ?? "").trim();
  const pdfs = formData
    .getAll("pdfs")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (!anfrageId) {
    return { ok: false, error: "Anfrage fehlt." };
  }

  const { data: row, error } = await supabaseAdmin
    .from("angebot_handwerker")
    .select(
      "id, handwerker_id, status, hw_status, hw_eingereicht_at, hw_angebot_pdf_url, hw_angebot_anhang_urls"
    )
    .eq("id", anfrageId)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, error: "Anfrage nicht gefunden." };
  }

  if (String(row.handwerker_id) !== link.handwerkerId) {
    return { ok: false, error: "Keine Berechtigung." };
  }

  if (String(row.status).toLowerCase() !== "akzeptiert" &&
      String(row.status).toLowerCase() !== "angenommen") {
    return { ok: false, error: "Nur für zugesagte Anfragen möglich." };
  }

  if (String(row.hw_status ?? "").toLowerCase() !== "uebernommen") {
    return {
      ok: false,
      error: "Unterlagen-PDF erst nach Preiseinigung mit Bärenwald möglich.",
    };
  }

  if (!pdfs.length) {
    return { ok: false, error: "Bitte mindestens ein PDF auswählen." };
  }

  const pdfErr = validatePartnerAngebotFiles(pdfs, { required: true });
  if (pdfErr) return { ok: false, error: pdfErr };

  const upload = await uploadPartnerAngebotPdfs({
    handwerkerId: link.handwerkerId,
    anfrageId,
    files: pdfs,
  });
  if (!upload.ok) return { ok: false, error: upload.error };

  const existingPaths = parseHwAnhangStoragePaths(
    row.hw_angebot_anhang_urls,
    (row.hw_angebot_pdf_url as string | null) ?? null
  );
  const combined = Array.from(new Set([...existingPaths, ...upload.paths]));
  if (combined.length > PARTNER_MAX_HW_UNTERLAGEN_GESAMT) {
    return {
      ok: false,
      error: `Maximal ${PARTNER_MAX_HW_UNTERLAGEN_GESAMT} Unterlagen pro Vorgang (bereits ${existingPaths.length} hochgeladen).`,
    };
  }
  const mergedPaths = combined;
  const primaryPath = mergedPaths[0]!;

  const { error: upErr } = await supabaseAdmin
    .from("angebot_handwerker")
    .update({
      hw_angebot_pdf_url: primaryPath,
      hw_angebot_anhang_urls: mergedPaths,
    })
    .eq("id", anfrageId)
    .eq("handwerker_id", link.handwerkerId);

  if (upErr) return { ok: false, error: upErr.message };

  revalidatePath("/partner");
  return { ok: true };
}

/** @deprecated Konditionen werden in der Anfrage-Phase eingereicht. */
export async function submitPartnerKonditionen(
  formData: FormData
): Promise<PartnerAngebotSubmitResult> {
  void formData;
  return {
    ok: false,
    error:
      "Konditionen werden bei der Anfrage bestätigt. Bitte unter „Anfragen“ antworten.",
  };
}

/** @deprecated Alias — nutzt submitPartnerKonditionen */
export async function submitPartnerAngebot(
  formData: FormData
): Promise<PartnerAngebotSubmitResult> {
  return submitPartnerKonditionen(formData);
}

export async function submitPartnerRechnung(
  formData: FormData
): Promise<PartnerAngebotSubmitResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Datenbank nicht konfiguriert." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false, error: "Nicht angemeldet." };
  }

  const link = await linkPortalHandwerkerToAuthUser({
    userId: user.id,
    email: user.email,
  });

  if (!link.ok) {
    return { ok: false, error: link.error };
  }

  const anfrageId = String(formData.get("anfrageId") ?? "").trim();
  const file = formData.get("pdf");

  if (!anfrageId) {
    return { ok: false, error: "Anfrage fehlt." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Bitte ein Rechnungs-PDF hochladen." };
  }

  const { data: row, error } = await supabaseAdmin
    .from("angebot_handwerker")
    .select(
      "id, handwerker_id, status, hw_eingereicht_at, hw_rechnung_eingereicht_at, hw_status"
    )
    .eq("id", anfrageId)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, error: "Anfrage nicht gefunden." };
  }

  if (String(row.handwerker_id) !== link.handwerkerId) {
    return { ok: false, error: "Keine Berechtigung." };
  }

  const st = String(row.status).toLowerCase();
  if (st !== "akzeptiert" && st !== "angenommen") {
    return { ok: false, error: "Nur für angenommene Anfragen möglich." };
  }

  if (!row.hw_eingereicht_at) {
    return {
      ok: false,
      error: "Bitte zuerst die Anfrage mit Konditionen beantworten.",
    };
  }

  if (String(row.hw_status ?? "").toLowerCase() !== "uebernommen") {
    return {
      ok: false,
      error: "Rechnung erst nach Übernahme der Konditionen durch Bärenwald möglich.",
    };
  }

  if (row.hw_rechnung_eingereicht_at) {
    return { ok: false, error: "Du hast bereits eine Rechnung hochgeladen." };
  }

  const upload = await uploadPartnerPdf({
    handwerkerId: link.handwerkerId,
    anfrageId,
    file,
    kind: "rechnung",
  });

  if (!upload.ok) {
    return { ok: false, error: upload.error };
  }

  const now = new Date().toISOString();
  const { error: upErr } = await supabaseAdmin
    .from("angebot_handwerker")
    .update({
      hw_rechnung_pdf_url: upload.path,
      hw_rechnung_eingereicht_at: now,
    })
    .eq("id", anfrageId)
    .eq("handwerker_id", link.handwerkerId)
    .is("hw_rechnung_eingereicht_at", null);

  if (upErr) {
    return { ok: false, error: upErr.message };
  }

  const { data: mailCtx } = await supabaseAdmin
    .from("angebot_handwerker")
    .select(
      `
      angebot_id,
      gewerke(name),
      handwerker(name, firma),
      angebote(kunden(plz), leads(plz))
    `
    )
    .eq("id", anfrageId)
    .maybeSingle();

  if (mailCtx) {
    const m = mailCtx as Record<string, unknown>;
    const gw = Array.isArray(m.gewerke) ? m.gewerke[0] : m.gewerke;
    const hw = Array.isArray(m.handwerker) ? m.handwerker[0] : m.handwerker;
    const ang = Array.isArray(m.angebote) ? m.angebote[0] : m.angebote;
    const kunde = ang
      ? Array.isArray((ang as { kunden: unknown }).kunden)
        ? (ang as { kunden: { plz: string | null }[] }).kunden[0]
        : (ang as { kunden: { plz: string | null } | null }).kunden
      : null;
    const lead = ang
      ? Array.isArray((ang as { leads: unknown }).leads)
        ? (ang as { leads: { plz: string | null }[] }).leads[0]
        : (ang as { leads: { plz: string | null } | null }).leads
      : null;
    const rechnungPdfUrl = await resolvePartnerFileUrl(
      upload.path,
      MAIL_PDF_LINK_TTL_SEC
    );
    void sendPartnerInternalRechnungMail({
      handwerkerName: String((hw as { name?: string })?.name ?? "Partner"),
      firma: (hw as { firma?: string | null })?.firma ?? null,
      gewerkName: String((gw as { name?: string })?.name ?? "Gewerk"),
      plz:
        (kunde as { plz?: string | null })?.plz?.trim() ||
        (lead as { plz?: string | null })?.plz?.trim() ||
        "—",
      angebotId: String(m.angebot_id),
      rechnungPdfUrl,
    });
  }

  revalidatePath("/partner");
  return { ok: true };
}
