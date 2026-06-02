"use server";

import { revalidatePath } from "next/cache";

import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import { sendPartnerInternalAngebotMail } from "@/lib/partner/partner-mail";
import { uploadPartnerPdf } from "@/lib/partner/partner-storage";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export type PartnerAngebotSubmitResult =
  | { ok: true }
  | { ok: false; error: string };

function parsePrice(raw: string | null): number | null {
  if (!raw?.trim()) return null;
  const n = Number(raw.replace(",", ".").trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

export async function submitPartnerAngebot(
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
  const preisNetto = parsePrice(formData.get("preisNetto") as string | null);
  const preisBrutto = parsePrice(formData.get("preisBrutto") as string | null);
  const notiz = String(formData.get("notiz") ?? "").trim() || null;
  const file = formData.get("pdf");

  if (!anfrageId) {
    return { ok: false, error: "Anfrage fehlt." };
  }
  if (preisNetto == null && preisBrutto == null) {
    return { ok: false, error: "Bitte mindestens Netto- oder Bruttopreis angeben." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Bitte ein Angebots-PDF hochladen." };
  }

  const { data: row, error } = await supabaseAdmin
    .from("angebot_handwerker")
    .select("id, handwerker_id, status, hw_eingereicht_at, hw_status")
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

  if (row.hw_eingereicht_at) {
    return { ok: false, error: "Du hast bereits ein Angebot eingereicht." };
  }

  const upload = await uploadPartnerPdf({
    handwerkerId: link.handwerkerId,
    anfrageId,
    file,
  });

  if (!upload.ok) {
    return { ok: false, error: upload.error };
  }

  const now = new Date().toISOString();
  const { error: upErr } = await supabaseAdmin
    .from("angebot_handwerker")
    .update({
      hw_preis_netto: preisNetto,
      hw_preis_brutto: preisBrutto,
      hw_angebot_pdf_url: upload.path,
      hw_eingereicht_at: now,
      hw_status: "eingereicht",
      hw_notiz: notiz,
    })
    .eq("id", anfrageId)
    .eq("handwerker_id", link.handwerkerId)
    .is("hw_eingereicht_at", null);

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
    });
  }

  revalidatePath("/partner");
  return { ok: true };
}
