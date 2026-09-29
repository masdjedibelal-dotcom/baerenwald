"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

import { logDbError } from "@/lib/errors/log-db-error";
import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import { PARTNER_UPLOAD_BUCKET } from "@/lib/partner/partner-storage";
import {
  validatePartnerAngebotFiles,
  validatePartnerPdfFile,
} from "@/lib/partner/partner-upload-limits";
import { writeEinsatzStatus } from "@/lib/status/write-einsatz-status";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

/**
 * Einsatz im Partner-Portal (Umbau P12): annehmen oder ablehnen, in einem Schritt fertig melden,
 * danach Rechnung (PDF oder Freitext-Positionen). Der Partner sieht nur Anweisung und EK.
 */

export type PartnerEinsatz = {
  id: string;
  titel: string;
  anweisung: string | null;
  termin_von: string | null;
  termin_bis: string | null;
  ort: string | null;
  kontakt_vor_ort: string | null;
  ek_betrag: number | null;
  ek_art: "netto" | "brutto";
  status: "gesendet" | "angenommen" | "abgelehnt" | "fertig";
  fertig_at: string | null;
  rechnung_eingereicht_at: string | null;
};

type Result = { ok: true } | { ok: false; error: string };

async function partnerAuth() {
  if (!isSupabaseConfigured()) {
    return { ok: false as const, error: "Portal ist nicht konfiguriert." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !user.email) {
    return { ok: false as const, error: "Bitte melden Sie sich an." };
  }
  const link = await linkPortalHandwerkerToAuthUser({ userId: user.id, email: user.email });
  if (!link.ok) return { ok: false as const, error: link.error };
  return { ok: true as const, handwerkerId: link.handwerkerId };
}

const SELECT =
  "id, titel, anweisung, termin_von, termin_bis, ort, kontakt_vor_ort, ek_betrag, ek_art, status, fertig_at, rechnung_eingereicht_at";

export async function listPartnerEinsaetze(): Promise<
  { ok: true; einsaetze: PartnerEinsatz[] } | { ok: false; error: string }
> {
  const auth = await partnerAuth();
  if (!auth.ok) return auth;
  const { data, error } = await supabaseAdmin
    .from("einsaetze")
    .select(SELECT)
    .eq("handwerker_id", auth.handwerkerId)
    .order("gesendet_at", { ascending: false })
    .limit(100);
  if (error) {
    logDbError("app/actions/partner-einsatz:list", error);
    return { ok: false, error: "Einsätze konnten nicht geladen werden." };
  }
  return {
    ok: true,
    einsaetze: (data ?? []).map((r) => ({
      ...(r as Omit<PartnerEinsatz, "ek_betrag" | "ek_art">),
      ek_betrag: r.ek_betrag == null ? null : Number(r.ek_betrag),
      ek_art: r.ek_art === "brutto" ? "brutto" : "netto",
    })) as PartnerEinsatz[],
  };
}

async function eigenerEinsatz(handwerkerId: string, einsatzId: string) {
  const { data, error } = await supabaseAdmin
    .from("einsaetze")
    .select("id, auftrag_id, status, rechnung_eingereicht_at")
    .eq("id", einsatzId)
    .eq("handwerker_id", handwerkerId)
    .maybeSingle();
  if (error) logDbError("app/actions/partner-einsatz:load", error);
  return data;
}

function done(): Result {
  revalidatePath("/partner");
  return { ok: true };
}

export async function einsatzAnnehmen(einsatzId: string): Promise<Result> {
  const auth = await partnerAuth();
  if (!auth.ok) return auth;
  const e = await eigenerEinsatz(auth.handwerkerId, einsatzId);
  if (!e) return { ok: false, error: "Einsatz nicht gefunden." };
  if (e.status !== "gesendet") return { ok: false, error: "Dieser Einsatz ist nicht mehr offen." };
  const w = await writeEinsatzStatus(supabaseAdmin, {
    einsatzId,
    handwerkerId: auth.handwerkerId,
    von: "gesendet",
    nach: "angenommen",
    extra: { angenommen_at: new Date().toISOString() },
  });
  if (!w.ok) return w;
  return done();
}

export async function einsatzAblehnen(einsatzId: string, grund: string): Promise<Result> {
  const auth = await partnerAuth();
  if (!auth.ok) return auth;
  const g = grund.trim();
  if (!g) return { ok: false, error: "Bitte kurz den Grund angeben." };
  const e = await eigenerEinsatz(auth.handwerkerId, einsatzId);
  if (!e) return { ok: false, error: "Einsatz nicht gefunden." };
  if (e.status !== "gesendet") return { ok: false, error: "Dieser Einsatz ist nicht mehr offen." };
  const w = await writeEinsatzStatus(supabaseAdmin, {
    einsatzId,
    handwerkerId: auth.handwerkerId,
    von: "gesendet",
    nach: "abgelehnt",
    extra: { abgelehnt_at: new Date().toISOString(), ablehnung_grund: g },
  });
  if (!w.ok) return w;
  return done();
}

async function uploadDateien(
  handwerkerId: string,
  einsatzId: string,
  files: File[],
  ordner: string
): Promise<{ ok: true; dateien: { name: string; path: string }[] } | { ok: false; error: string }> {
  const out: { name: string; path: string }[] = [];
  for (const file of files) {
    const mime =
      file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg");
    const ext = mime === "application/pdf" ? "pdf" : mime.split("/")[1] || "jpg";
    const path = `${handwerkerId}/einsatz/${einsatzId}/${ordner}/${randomUUID()}.${ext}`;
    const { error } = await supabaseAdmin.storage
      .from(PARTNER_UPLOAD_BUCKET)
      .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: mime, upsert: false });
    if (error) {
      logDbError("app/actions/partner-einsatz:upload", error);
      return { ok: false, error: "Datei konnte nicht hochgeladen werden." };
    }
    out.push({ name: file.name || "Datei", path });
  }
  return { ok: true, dateien: out };
}

/** Fertig melden in einem Schritt: Text optional, Fotos/Protokolle als Dateien. */
export async function einsatzFertigMelden(formData: FormData): Promise<Result> {
  const auth = await partnerAuth();
  if (!auth.ok) return auth;
  const einsatzId = String(formData.get("einsatzId") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim() || null;
  const files = formData.getAll("dateien").filter((f): f is File => f instanceof File && f.size > 0);
  const e = await eigenerEinsatz(auth.handwerkerId, einsatzId);
  if (!e) return { ok: false, error: "Einsatz nicht gefunden." };
  if (e.status !== "angenommen") return { ok: false, error: "Bitte den Einsatz zuerst annehmen." };
  if (!text && !files.length) return { ok: false, error: "Bitte Fotos, Dokumente oder eine kurze Beschreibung angeben." };
  if (files.length) {
    const err = validatePartnerAngebotFiles(files, { required: false });
    if (err) return { ok: false, error: err };
  }
  const up = await uploadDateien(auth.handwerkerId, einsatzId, files, "fertig");
  if (!up.ok) return up;
  const w = await writeEinsatzStatus(supabaseAdmin, {
    einsatzId,
    handwerkerId: auth.handwerkerId,
    von: "angenommen",
    nach: "fertig",
    extra: { fertig_at: new Date().toISOString(), fertig_text: text, fertig_dateien: up.dateien },
  });
  if (!w.ok) return w;
  return done();
}

/** Rechnung nach der Fertigmeldung: PDF oder Freitext-Positionen [{ text, betrag }]. */
export async function einsatzRechnungSenden(formData: FormData): Promise<Result> {
  const auth = await partnerAuth();
  if (!auth.ok) return auth;
  const einsatzId = String(formData.get("einsatzId") ?? "").trim();
  const pdf = formData.get("pdf");
  const hatPdf = pdf instanceof File && pdf.size > 0;
  let positionen: { text: string; betrag: number }[] = [];
  try {
    const raw = JSON.parse(String(formData.get("positionen") ?? "[]")) as unknown;
    if (Array.isArray(raw)) {
      positionen = raw
        .map((p) => ({
          text: String((p as { text?: unknown }).text ?? "").trim(),
          betrag: Number((p as { betrag?: unknown }).betrag) || 0,
        }))
        .filter((p) => p.text && p.betrag > 0);
    }
  } catch {
    positionen = [];
  }
  const e = await eigenerEinsatz(auth.handwerkerId, einsatzId);
  if (!e) return { ok: false, error: "Einsatz nicht gefunden." };
  if (e.status !== "fertig") return { ok: false, error: "Die Rechnung ist nach der Fertigmeldung möglich." };
  if (e.rechnung_eingereicht_at) return { ok: false, error: "Die Rechnung ist bereits eingereicht." };
  if (!hatPdf && !positionen.length) {
    return { ok: false, error: "Bitte ein PDF hochladen oder Positionen mit Betrag angeben." };
  }
  let pdfPath: string | null = null;
  if (hatPdf) {
    const err = validatePartnerPdfFile(pdf as File);
    if (err) return { ok: false, error: err };
    const up = await uploadDateien(auth.handwerkerId, einsatzId, [pdf as File], "rechnung");
    if (!up.ok) return up;
    pdfPath = up.dateien[0]?.path ?? null;
  }
  const betrag = positionen.length
    ? Math.round(positionen.reduce((s, p) => s + p.betrag, 0) * 100) / 100
    : null;
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("einsaetze")
    .update({
      rechnung_pdf_url: pdfPath,
      rechnung_positionen: positionen.length ? positionen : null,
      rechnung_betrag: betrag,
      rechnung_eingereicht_at: now,
      updated_at: now,
    })
    .eq("id", einsatzId)
    .eq("handwerker_id", auth.handwerkerId);
  if (error) {
    logDbError("app/actions/partner-einsatz:rechnung", error);
    return { ok: false, error: "Rechnung konnte nicht gespeichert werden." };
  }
  return done();
}

/**
 * Mitteilung an Bärenwald während des Einsatzes (Umbau P13):
 * Regie (Stunden + Beschreibung, optional Foto) oder Behinderung (Beschreibung).
 * Bärenwald übernimmt Regie in den Auftrag; der Partner rechnet sie mit seiner Rechnung ab.
 */
export async function einsatzMitteilungSenden(formData: FormData): Promise<Result> {
  const auth = await partnerAuth();
  if (!auth.ok) return auth;
  const einsatzId = String(formData.get("einsatzId") ?? "").trim();
  const typ = String(formData.get("typ") ?? "") === "behinderung" ? "behinderung" : "regie";
  const text = String(formData.get("text") ?? "").trim();
  const stundenRaw = Number(String(formData.get("stunden") ?? "").replace(",", "."));
  const stunden = Number.isFinite(stundenRaw) && stundenRaw > 0 ? Math.round(stundenRaw * 100) / 100 : null;
  const files = formData.getAll("dateien").filter((f): f is File => f instanceof File && f.size > 0);

  const e = await eigenerEinsatz(auth.handwerkerId, einsatzId);
  if (!e) return { ok: false, error: "Einsatz nicht gefunden." };
  if (e.status !== "angenommen") return { ok: false, error: "Mitteilungen sind während eines angenommenen Einsatzes möglich." };
  if (!text) return { ok: false, error: "Bitte kurz beschreiben, worum es geht." };
  if (typ === "regie" && !stunden) return { ok: false, error: "Bitte die Stunden für die Regie angeben." };
  if (files.length) {
    const err = validatePartnerAngebotFiles(files, { required: false });
    if (err) return { ok: false, error: err };
  }
  const up = await uploadDateien(auth.handwerkerId, einsatzId, files, "mitteilung");
  if (!up.ok) return up;

  const { error } = await supabaseAdmin.from("einsatz_mitteilungen").insert({
    einsatz_id: einsatzId,
    auftrag_id: e.auftrag_id,
    handwerker_id: auth.handwerkerId,
    typ,
    text,
    stunden: typ === "regie" ? stunden : null,
    dateien: up.dateien,
  });
  if (error) {
    logDbError("app/actions/partner-einsatz:mitteilung", error);
    return { ok: false, error: "Mitteilung konnte nicht gesendet werden." };
  }
  return done();
}
