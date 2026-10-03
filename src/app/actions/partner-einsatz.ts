"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

import { logDbError } from "@/lib/errors/log-db-error";
import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import { filterActiveLeadIds } from "@/lib/portal/lead-not-deleted";
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
  /** Datum des letzten eigenen Updates. */
  letztes_update_at: string | null;
  /** Gemeldete Regie mit Rückmeldung von Bärenwald. */
  regie: { id: string; stunden: number | null; text: string; stand: "offen" | "angenommen" | "abgelehnt" }[];
};

export type EinsatzMeldungTyp = "update" | "regie";

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

/**
 * Datenschutz: Der Partner sieht nur, was ihn noch betrifft. Abgelehnte Einsätze, gelöschte
 * Vorgänge und stornierte Aufträge (solange nicht fertig) verschwinden aus dem Portal.
 * Fertige Einsätze bleiben als Erledigt sichtbar.
 */
async function sichtbareEinsatzIds(
  rows: { id: string; auftrag_id: string; status: string }[]
): Promise<Set<string>> {
  const offen = rows.filter((r) => r.status !== "abgelehnt");
  const auftragIds = Array.from(new Set(offen.map((r) => r.auftrag_id)));
  if (!auftragIds.length) return new Set();
  const { data: auftraege, error } = await supabaseAdmin
    .from("auftraege")
    .select("id, status, lead_id")
    .in("id", auftragIds);
  if (error) logDbError("app/actions/partner-einsatz:auftraege", error);
  const aktiveLeads = await filterActiveLeadIds(
    (auftraege ?? []).map((a) => String(a.lead_id ?? "")).filter(Boolean)
  );
  const auftragOk = new Map<string, { storniert: boolean }>();
  for (const a of auftraege ?? []) {
    const leadId = String(a.lead_id ?? "");
    if (leadId && !aktiveLeads.has(leadId)) continue;
    auftragOk.set(String(a.id), { storniert: a.status === "storniert" });
  }
  return new Set(
    offen
      .filter((r) => {
        const a = auftragOk.get(r.auftrag_id);
        return Boolean(a) && (!a!.storniert || r.status === "fertig");
      })
      .map((r) => r.id)
  );
}

export async function listPartnerEinsaetze(): Promise<
  { ok: true; einsaetze: PartnerEinsatz[] } | { ok: false; error: string }
> {
  const auth = await partnerAuth();
  if (!auth.ok) return auth;
  const { data: alle, error } = await supabaseAdmin
    .from("einsaetze")
    .select(`${SELECT}, auftrag_id`)
    .eq("handwerker_id", auth.handwerkerId)
    .order("gesendet_at", { ascending: false })
    .limit(100);
  if (error) {
    logDbError("app/actions/partner-einsatz:list", error);
    return { ok: false, error: "Einsätze konnten nicht geladen werden." };
  }
  const sichtbar = await sichtbareEinsatzIds(
    (alle ?? []).map((r) => ({
      id: r.id as string,
      auftrag_id: r.auftrag_id as string,
      status: r.status as string,
    }))
  );
  const data = (alle ?? [])
    .filter((r) => sichtbar.has(r.id as string))
    .map(({ auftrag_id: _a, ...r }) => r);
  const ids = data.map((r) => r.id as string);
  const letzte = new Map<string, string>();
  const regie = new Map<string, PartnerEinsatz["regie"]>();
  if (ids.length) {
    const { data: meldungen } = await supabaseAdmin
      .from("einsatz_mitteilungen")
      .select("id, einsatz_id, typ, text, stunden, status, created_at")
      .in("einsatz_id", ids)
      .order("created_at", { ascending: false });
    for (const m of meldungen ?? []) {
      if (m.typ === "regie") {
        const liste = regie.get(m.einsatz_id) ?? [];
        liste.push({
          id: m.id,
          stunden: m.stunden == null ? null : Number(m.stunden),
          text: m.text ?? "",
          stand: m.status === "uebernommen" ? "angenommen" : m.status === "erledigt" ? "abgelehnt" : "offen",
        });
        regie.set(m.einsatz_id, liste);
      } else if (!letzte.has(m.einsatz_id)) {
        letzte.set(m.einsatz_id, m.created_at);
      }
    }
  }
  return {
    ok: true,
    einsaetze: data.map((r) => ({
      ...(r as Omit<PartnerEinsatz, "ek_betrag" | "ek_art" | "letztes_update_at" | "regie">),
      ek_betrag: r.ek_betrag == null ? null : Number(r.ek_betrag),
      ek_art: r.ek_art === "brutto" ? "brutto" : "netto",
      letztes_update_at: letzte.get(r.id as string) ?? null,
      regie: regie.get(r.id as string) ?? [],
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
  if (!data) return null;
  const sichtbar = await sichtbareEinsatzIds([
    { id: data.id as string, auftrag_id: data.auftrag_id as string, status: data.status as string },
  ]);
  return sichtbar.has(data.id as string) ? data : null;
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

/** Rechnung aus Formular (PDF und/oder Positionen) → Felder am Einsatz; null = keine Rechnung angegeben. */
async function rechnungAusFormData(
  handwerkerId: string,
  einsatzId: string,
  formData: FormData,
  pdfFeld: string
): Promise<{ ok: true; patch: Record<string, unknown> | null } | { ok: false; error: string }> {
  const pdf = formData.get(pdfFeld);
  const hatPdf = pdf instanceof File && pdf.size > 0;
  let positionen: { text: string; betrag: number }[] = [];
  try {
    const raw = JSON.parse(String(formData.get("positionen") ?? "[]")) as unknown;
    if (Array.isArray(raw)) {
      positionen = raw
        .map((p) => ({
          text: String((p as { text?: unknown }).text ?? "").trim(),
          betrag: Number(String((p as { betrag?: unknown }).betrag ?? "").replace(",", ".")) || 0,
        }))
        .filter((p) => p.text && p.betrag > 0);
    }
  } catch {
    positionen = [];
  }
  if (!hatPdf && !positionen.length) return { ok: true, patch: null };
  let pdfPath: string | null = null;
  if (hatPdf) {
    const err = validatePartnerPdfFile(pdf as File);
    if (err) return { ok: false, error: err };
    const up = await uploadDateien(handwerkerId, einsatzId, [pdf as File], "rechnung");
    if (!up.ok) return up;
    pdfPath = up.dateien[0]?.path ?? null;
  }
  const betrag = positionen.length
    ? Math.round(positionen.reduce((sum, p) => sum + p.betrag, 0) * 100) / 100
    : null;
  return {
    ok: true,
    patch: {
      rechnung_pdf_url: pdfPath,
      rechnung_positionen: positionen.length ? positionen : null,
      rechnung_betrag: betrag,
      rechnung_eingereicht_at: new Date().toISOString(),
      rechnung_von: "partner",
    },
  };
}

/** Erledigt melden in einem Schritt: Text, Fotos und Rechnung (PDF oder Positionen) sind freiwillig. */
export async function einsatzFertigMelden(formData: FormData): Promise<Result> {
  const auth = await partnerAuth();
  if (!auth.ok) return auth;
  const einsatzId = String(formData.get("einsatzId") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim() || null;
  const files = formData.getAll("dateien").filter((f): f is File => f instanceof File && f.size > 0);
  const e = await eigenerEinsatz(auth.handwerkerId, einsatzId);
  if (!e) return { ok: false, error: "Einsatz nicht gefunden." };
  if (e.status !== "angenommen") return { ok: false, error: "Bitte den Einsatz zuerst annehmen." };
  if (files.length) {
    const err = validatePartnerAngebotFiles(files, { required: false });
    if (err) return { ok: false, error: err };
  }
  const up = await uploadDateien(auth.handwerkerId, einsatzId, files, "fertig");
  if (!up.ok) return up;
  // Rechnung gleich mitschicken (oder später nachreichen)
  const re = await rechnungAusFormData(auth.handwerkerId, einsatzId, formData, "rechnungPdf");
  if (!re.ok) return re;
  const w = await writeEinsatzStatus(supabaseAdmin, {
    einsatzId,
    handwerkerId: auth.handwerkerId,
    von: "angenommen",
    nach: "fertig",
    extra: {
      fertig_at: new Date().toISOString(),
      fertig_text: text,
      fertig_dateien: up.dateien,
      fertig_von: "partner",
      ...(re.patch ?? {}),
    },
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
  const typRaw = String(formData.get("typ") ?? "");
  const typ: EinsatzMeldungTyp = typRaw === "regie" ? "regie" : "update";
  const text = String(formData.get("text") ?? "").trim();
  const stundenRaw = Number(String(formData.get("stunden") ?? "").replace(",", "."));
  const stunden = Number.isFinite(stundenRaw) && stundenRaw > 0 ? Math.round(stundenRaw * 100) / 100 : null;
  const files = formData.getAll("dateien").filter((f): f is File => f instanceof File && f.size > 0);

  const e = await eigenerEinsatz(auth.handwerkerId, einsatzId);
  if (!e) return { ok: false, error: "Einsatz nicht gefunden." };
  if (e.status !== "angenommen") return { ok: false, error: "Updates sind möglich, solange der Einsatz läuft." };
  if (typ === "update" ? !text && files.length === 0 : !text) {
    return {
      ok: false,
      error: typ === "update" ? "Bitte einen Text oder ein Foto hinzufügen." : "Bitte kurz beschreiben, was gemacht wurde.",
    };
  }
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
    return { ok: false, error: "Update konnte nicht gesendet werden." };
  }
  return done();
}
