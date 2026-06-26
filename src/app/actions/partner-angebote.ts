"use server";

import { revalidatePath } from "next/cache";

import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import {
  buildHwKonditionenPayload,
  buildPartnerKonditionZeilen,
  parseHwNettoInput,
  parsePartnerHwKonditionen,
  summeKonditionBrutto,
  summeKonditionNetto,
  type PartnerHwKonditionen,
} from "@/lib/partner/partner-konditionen";
import {
  MAIL_PDF_LINK_TTL_SEC,
  sendPartnerInternalAngebotMail,
  sendPartnerInternalRechnungMail,
} from "@/lib/partner/partner-mail";
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

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function submitPartnerKonditionen(
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
  const notiz = String(formData.get("notiz") ?? "").trim() || null;
  const konditionenRaw = String(formData.get("konditionenJson") ?? "").trim();
  const pdfs = formData
    .getAll("pdfs")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (!anfrageId) {
    return { ok: false, error: "Anfrage fehlt." };
  }

  let eingabe: Array<{ position_id: string; hw_netto: number }> = [];
  try {
    const parsed = JSON.parse(konditionenRaw) as unknown;
    if (!Array.isArray(parsed)) throw new Error("invalid");
    eingabe = parsed
      .map((row) => {
        if (!row || typeof row !== "object") return null;
        const r = row as Record<string, unknown>;
        const id = String(r.position_id ?? "").trim();
        const hw = parseHwNettoInput(String(r.hw_netto ?? ""));
        if (!id || hw == null) return null;
        return { position_id: id, hw_netto: hw };
      })
      .filter((r): r is { position_id: string; hw_netto: number } => Boolean(r));
  } catch {
    return { ok: false, error: "Konditionen konnten nicht gelesen werden." };
  }

  if (!eingabe.length) {
    return { ok: false, error: "Bitte für jede Leistung einen gültigen Netto-Preis angeben." };
  }

  const { data: row, error } = await supabaseAdmin
    .from("angebot_handwerker")
    .select(
      `
      id,
      handwerker_id,
      gewerk_id,
      status,
      hw_eingereicht_at,
      hw_status,
      angebote(positionen)
    `
    )
    .eq("id", anfrageId)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, error: "Anfrage nicht gefunden." };
  }

  if (String(row.handwerker_id) !== link.handwerkerId) {
    return { ok: false, error: "Keine Berechtigung." };
  }

  if (String(row.status).toLowerCase() !== "akzeptiert") {
    return { ok: false, error: "Nur angenommene Anfragen können eingereicht werden." };
  }

  const hwSt = String(row.hw_status ?? "offen").toLowerCase();
  const darfEinreichen = ["offen", "abgelehnt", "rueckfrage"].includes(hwSt);
  if (!darfEinreichen) {
    if (hwSt === "eingereicht") {
      return { ok: false, error: "Deine Konditionen werden gerade geprüft." };
    }
    if (hwSt === "uebernommen") {
      return { ok: false, error: "Deine Konditionen wurden bereits übernommen." };
    }
    return { ok: false, error: "Einreichung derzeit nicht möglich." };
  }

  const angebote = Array.isArray(row.angebote) ? row.angebote[0] : row.angebote;
  const positionenRaw = (angebote as { positionen?: unknown } | null)?.positionen;
  const zeilen = buildPartnerKonditionZeilen(positionenRaw, {
    gewerkId: String(row.gewerk_id ?? ""),
  });

  if (!zeilen.length) {
    return { ok: false, error: "Keine Leistungen für dieses Gewerk gefunden." };
  }

  const hwById = Object.fromEntries(eingabe.map((e) => [e.position_id, e.hw_netto]));
  for (const z of zeilen) {
    if (hwById[z.id] == null) {
      return {
        ok: false,
        error: `Bitte einen Preis für „${z.title}“ angeben.`,
      };
    }
  }

  const konditionen: PartnerHwKonditionen = buildHwKonditionenPayload(zeilen, hwById);
  const preisNetto = summeKonditionNetto(
    konditionen.positionen.map((p) => ({
      hwNetto: p.hw_netto,
      vorschlagNetto: p.ek_netto,
    })),
    true
  );
  const preisBrutto = summeKonditionBrutto(
    konditionen.positionen.map((p) => ({
      id: p.position_id,
      title: p.leistung,
      vorschlagNetto: p.ek_netto,
      hwNetto: p.hw_netto,
      mwstSatz: p.mwst_satz,
    })),
    true
  );

  let primaryPath: string | null = null;
  let anhangPaths: string[] = [];
  if (pdfs.length) {
    const pdfErr = validatePartnerAngebotFiles(pdfs, { required: false });
    if (pdfErr) return { ok: false, error: pdfErr };
    const upload = await uploadPartnerAngebotPdfs({
      handwerkerId: link.handwerkerId,
      anfrageId,
      files: pdfs,
    });
    if (!upload.ok) return { ok: false, error: upload.error };
    primaryPath = upload.paths[0]!;
    anhangPaths = upload.paths;
  }

  const now = new Date().toISOString();
  konditionen.eingereicht_at = now;

  const { error: upErr } = await supabaseAdmin
    .from("angebot_handwerker")
    .update({
      hw_konditionen: konditionen,
      hw_preis_netto: round2(preisNetto),
      hw_preis_brutto: round2(preisBrutto),
      hw_angebot_pdf_url: primaryPath,
      hw_angebot_anhang_urls: anhangPaths,
      hw_eingereicht_at: now,
      hw_status: "eingereicht",
      hw_notiz: notiz,
      hw_crm_notiz: null,
      hw_crm_antwort_at: null,
    })
    .eq("id", anfrageId)
    .eq("handwerker_id", link.handwerkerId)
    .in("hw_status", ["offen", "abgelehnt", "rueckfrage"]);

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
    const angebotPdfUrl = primaryPath
      ? await resolvePartnerFileUrl(primaryPath, MAIL_PDF_LINK_TTL_SEC)
      : null;
    const artLabel =
      konditionen.art === "bestaetigt" ? "Konditionen bestätigt" : "Gegenvorschlag";
    void sendPartnerInternalAngebotMail({
      handwerkerName: String((hw as { name?: string })?.name ?? "Partner"),
      firma: (hw as { firma?: string | null })?.firma ?? null,
      gewerkName: String((gw as { name?: string })?.name ?? "Gewerk"),
      plz:
        (kunde as { plz?: string | null })?.plz?.trim() ||
        (lead as { plz?: string | null })?.plz?.trim() ||
        "—",
      preisNetto,
      preisBrutto,
      angebotId: String(m.angebot_id),
      angebotPdfUrl,
      konditionenArt: artLabel,
      positionen: konditionen.positionen.map((p) => ({
        leistung: p.leistung,
        ekNetto: p.ek_netto,
        hwNetto: p.hw_netto,
        geaendert: p.geaendert,
      })),
    });
  }

  revalidatePath("/partner");
  return { ok: true };
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

  if (String(row.status).toLowerCase() !== "akzeptiert") {
    return { ok: false, error: "Nur für angenommene Anfragen möglich." };
  }

  if (!row.hw_eingereicht_at) {
    return {
      ok: false,
      error: "Bitte zuerst deine Konditionen bestätigen oder einen Gegenvorschlag senden.",
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
