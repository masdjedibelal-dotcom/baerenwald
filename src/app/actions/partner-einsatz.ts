"use server";

import { linkPortalMitarbeiter } from "@/lib/partner/mitarbeiter-portal";
import { crmMitarbeiterInformieren } from "@/lib/partner/partner-crm-api";
import { revalidatePath } from "next/cache";

import { logDbError } from "@/lib/errors/log-db-error";
import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import { filterActiveLeadIds } from "@/lib/portal/lead-not-deleted";
import { PARTNER_UPLOAD_BUCKET } from "@/lib/partner/partner-storage";
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
  /** Fotos von Bärenwald zur Anweisung (öffentliche URLs) */
  anweisung_fotos: string[];
  /** Eingeteilter Mitarbeiter (Vorschlag von Bärenwald bzw. Wahl des Inhabers) */
  mitarbeiter_id: string | null;
  mitarbeiter_name: string | null;
  termin_von: string | null;
  termin_bis: string | null;
  ort: string | null;
  kontakt_vor_ort: string | null;
  ek_betrag: number | null;
  ek_art: "netto" | "brutto";
  status: "gesendet" | "angenommen" | "abgelehnt" | "fertig";
  fertig_at: string | null;
  rechnung_eingereicht_at: string | null;
  /** Bärenwald hat die Rechnung bezahlt (im CRM markiert). */
  rechnung_bezahlt_at: string | null;
  /** Vorgang im CRM abgeschlossen → im Portal als erledigt, keine Schritte mehr. */
  vorgang_erledigt: boolean;
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

/**
 * Zugriff für Einsatz-Aktionen: Inhaber (voller Zugriff auf eigene Einsätze) oder Mitarbeiter
 * (nur ihm zugeordnete, angenommene/fertige Einsätze; nur Updates, Fotos, Fertigmeldung).
 */
type Zugriff = { ok: true; handwerkerId: string; mitarbeiterId: string | null } | { ok: false; error: string };

async function einsatzZugriff(): Promise<Zugriff> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Portal ist nicht konfiguriert." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !user.email) return { ok: false, error: "Bitte melden Sie sich an." };
  const ma = await linkPortalMitarbeiter({ userId: user.id, email: user.email });
  if (ma) return { ok: true, handwerkerId: ma.handwerkerId, mitarbeiterId: ma.mitarbeiterId };
  const auth = await partnerAuth();
  return auth.ok ? { ok: true, handwerkerId: auth.handwerkerId, mitarbeiterId: null } : auth;
}

async function einsatzFuerZugriff(z: Extract<Zugriff, { ok: true }>, einsatzId: string) {
  const e = await eigenerEinsatz(z.handwerkerId, einsatzId);
  if (!e) return null;
  if (z.mitarbeiterId) {
    if (e.mitarbeiter_id !== z.mitarbeiterId) return null;
    if (e.status !== "angenommen" && e.status !== "fertig") return null;
  }
  return e;
}

const SELECT =
  "id, titel, anweisung, anweisung_fotos, mitarbeiter_id, handwerker_mitarbeiter(name), termin_von, termin_bis, ort, kontakt_vor_ort, ek_betrag, ek_art, status, fertig_at, rechnung_eingereicht_at, rechnung_bezahlt_at";

/**
 * Datenschutz: Der Partner sieht nur, was ihn noch betrifft. Abgelehnte Einsätze, gelöschte
 * Vorgänge und stornierte Aufträge (solange nicht fertig) verschwinden aus dem Portal.
 * Fertige Einsätze bleiben als Erledigt sichtbar.
 */
async function sichtbareEinsatzIds(
  rows: { id: string; auftrag_id: string; status: string }[],
  erledigteAuftraege?: Set<string>
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
    if (a.status === "abgeschlossen") erledigteAuftraege?.add(String(a.id));
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
  const erledigt = new Set<string>();
  const sichtbar = await sichtbareEinsatzIds(
    (alle ?? []).map((r) => ({
      id: r.id as string,
      auftrag_id: r.auftrag_id as string,
      status: r.status as string,
    })),
    erledigt
  );
  const data = (alle ?? [])
    .filter((r) => sichtbar.has(r.id as string))
    .map(({ auftrag_id, ...r }) => ({ ...r, vorgang_erledigt: erledigt.has(String(auftrag_id)) }));
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
      ...(r as Omit<PartnerEinsatz, "ek_betrag" | "ek_art" | "letztes_update_at" | "regie" | "rechnung_bezahlt_at" | "anweisung_fotos" | "mitarbeiter_name">),
      mitarbeiter_id: (r.mitarbeiter_id as string | null) ?? null,
      mitarbeiter_name: (() => {
        const m = (r as { handwerker_mitarbeiter?: unknown }).handwerker_mitarbeiter as { name?: string | null } | { name?: string | null }[] | null;
        return (Array.isArray(m) ? m[0] : m)?.name ?? null;
      })(),
      anweisung_fotos: Array.isArray(r.anweisung_fotos)
        ? (r.anweisung_fotos as unknown[]).map((u) => String(u ?? "")).filter((u) => /^https:\/\//i.test(u))
        : [],
      rechnung_bezahlt_at: (r.rechnung_bezahlt_at as string | null) ?? null,
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
    .select("id, auftrag_id, status, rechnung_eingereicht_at, mitarbeiter_id")
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

export async function einsatzAnnehmen(einsatzId: string, mitarbeiterId?: string | null): Promise<Result> {
  const auth = await partnerAuth();
  if (!auth.ok) return auth;
  const e = await eigenerEinsatz(auth.handwerkerId, einsatzId);
  if (!e) return { ok: false, error: "Einsatz nicht gefunden." };
  if (e.status !== "gesendet") return { ok: false, error: "Dieser Einsatz ist nicht mehr offen." };
  // Inhaber teilt beim Annehmen ein (undefined = Vorschlag von Bärenwald behalten)
  if (mitarbeiterId !== undefined) {
    if (mitarbeiterId) {
      const { data: m } = await supabaseAdmin
        .from("handwerker_mitarbeiter")
        .select("id")
        .eq("id", mitarbeiterId)
        .eq("handwerker_id", auth.handwerkerId)
        .eq("aktiv", true)
        .maybeSingle();
      if (!m) return { ok: false, error: "Mitarbeiter nicht gefunden." };
    }
    const { error: mErr } = await supabaseAdmin.from("einsaetze").update({ mitarbeiter_id: mitarbeiterId }).eq("id", einsatzId);
    if (mErr) logDbError("app/actions/partner-einsatz:mitarbeiter", mErr);
  }
  const w = await writeEinsatzStatus(supabaseAdmin, {
    einsatzId,
    handwerkerId: auth.handwerkerId,
    von: "gesendet",
    nach: "angenommen",
    extra: { angenommen_at: new Date().toISOString() },
  });
  if (!w.ok) return w;
  // Ab jetzt läuft der Einsatz beim Mitarbeiter: Info mit Anweisung und Fotos (CRM verschickt)
  await crmMitarbeiterInformieren(einsatzId);
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

/**
 * Dateien lädt das Portal direkt in den Speicher (Netlify nimmt nur ~4,5 MB je Anfrage an).
 * Der Server nennt den Zielordner und prüft später, dass jeder Pfad darin liegt.
 */
export type EinsatzUploadOrdner = "mitteilung" | "fertig" | "rechnung" | "dokument";

export type HochgeladeneDatei = { name: string; path: string; mime: string; size: number };

/** Max. Größe je Datei (Ablage „Dokumente“ erlaubt 10 MB). */
const MAX_DATEI_BYTES = 10 * 1024 * 1024;
const ERLAUBTE_TYPEN = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export async function einsatzUploadZiel(
  einsatzId: string,
  ordner: EinsatzUploadOrdner
): Promise<{ ok: true; prefix: string } | { ok: false; error: string }> {
  const auth = await einsatzZugriff();
  if (!auth.ok) return auth;
  if (auth.mitarbeiterId && ordner !== "mitteilung" && ordner !== "fertig") {
    return { ok: false, error: "Das macht der Inhaber Ihres Betriebs." };
  }
  const e = await einsatzFuerZugriff(auth, einsatzId);
  if (!e) return { ok: false, error: "Einsatz nicht gefunden." };
  return { ok: true, prefix: `${auth.handwerkerId}/einsatz/${einsatzId}/${ordner}/` };
}

/** Nur Dateien aus dem eigenen Ordner dieses Einsatzes, erlaubte Typen und Größe. */
function pruefeDateien(
  dateien: HochgeladeneDatei[] | null | undefined,
  handwerkerId: string,
  einsatzId: string,
  ordner: EinsatzUploadOrdner
): { ok: true; dateien: { name: string; path: string }[] } | { ok: false; error: string } {
  const prefix = `${handwerkerId}/einsatz/${einsatzId}/${ordner}/`;
  const liste = (dateien ?? []).filter(Boolean);
  if (liste.length > 10) return { ok: false, error: "Maximal 10 Dateien auf einmal." };
  for (const d of liste) {
    const pfad = String(d.path ?? "");
    if (!pfad.startsWith(prefix) || pfad.includes("..")) return { ok: false, error: "Ungültige Datei." };
    if (!ERLAUBTE_TYPEN.includes(String(d.mime))) return { ok: false, error: "Bitte nur PDF oder Fotos (JPG, PNG, WebP)." };
    if (Number(d.size) > MAX_DATEI_BYTES) return { ok: false, error: "Eine Datei ist größer als 10 MB." };
  }
  return { ok: true, dateien: liste.map((d) => ({ name: String(d.name || "Datei").slice(0, 120), path: d.path })) };
}

function rechnungPatch(pfad: string): Record<string, unknown> {
  return {
    rechnung_pdf_url: pfad,
    rechnung_positionen: null,
    rechnung_betrag: null,
    rechnung_eingereicht_at: new Date().toISOString(),
    rechnung_bezahlt_at: null,
    rechnung_von: "partner",
  };
}

/** Erledigt melden in einem Schritt: Text, Fotos und Rechnung (PDF) sind freiwillig. */
export async function einsatzFertigMelden(input: {
  einsatzId: string;
  text?: string | null;
  dateien?: HochgeladeneDatei[];
  rechnung?: HochgeladeneDatei | null;
}): Promise<Result> {
  const auth = await einsatzZugriff();
  if (!auth.ok) return auth;
  if (auth.mitarbeiterId && input.rechnung) return { ok: false, error: "Die Rechnung schickt der Inhaber Ihres Betriebs." };
  const einsatzId = input.einsatzId.trim();
  const e = await einsatzFuerZugriff(auth, einsatzId);
  if (!e) return { ok: false, error: "Einsatz nicht gefunden." };
  if (e.status !== "angenommen") return { ok: false, error: "Bitte den Einsatz zuerst annehmen." };
  const fotos = pruefeDateien(input.dateien, auth.handwerkerId, einsatzId, "fertig");
  if (!fotos.ok) return fotos;
  let patch: Record<string, unknown> = {};
  if (input.rechnung) {
    const re = pruefeDateien([input.rechnung], auth.handwerkerId, einsatzId, "rechnung");
    if (!re.ok) return re;
    if (input.rechnung.mime !== "application/pdf") return { ok: false, error: "Die Rechnung bitte als PDF hochladen." };
    patch = rechnungPatch(input.rechnung.path);
  }
  const w = await writeEinsatzStatus(supabaseAdmin, {
    einsatzId,
    handwerkerId: auth.handwerkerId,
    von: "angenommen",
    nach: "fertig",
    extra: {
      fertig_at: new Date().toISOString(),
      fertig_text: input.text?.trim() || null,
      fertig_dateien: fotos.dateien,
      fertig_von: "partner",
      ...patch,
    },
  });
  if (!w.ok) return w;
  return done();
}

/** Rechnung hochladen (nur PDF), nach der Fertigmeldung. */
export async function einsatzRechnungSenden(input: { einsatzId: string; rechnung: HochgeladeneDatei | null }): Promise<Result> {
  const auth = await partnerAuth();
  if (!auth.ok) return auth;
  const einsatzId = input.einsatzId.trim();
  const e = await eigenerEinsatz(auth.handwerkerId, einsatzId);
  if (!e) return { ok: false, error: "Einsatz nicht gefunden." };
  if (e.status !== "fertig") return { ok: false, error: "Die Rechnung ist nach der Fertigmeldung möglich." };
  if (e.rechnung_eingereicht_at) return { ok: false, error: "Die Rechnung ist bereits hochgeladen." };
  if (!input.rechnung || input.rechnung.mime !== "application/pdf") {
    return { ok: false, error: "Bitte die Rechnung als PDF hochladen." };
  }
  const re = pruefeDateien([input.rechnung], auth.handwerkerId, einsatzId, "rechnung");
  if (!re.ok) return re;
  const { error } = await supabaseAdmin
    .from("einsaetze")
    .update({ ...rechnungPatch(input.rechnung.path), updated_at: new Date().toISOString() })
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
 * Update (Text/Fotos) oder Regie (Stunden + Beschreibung, optional Foto).
 */
export async function einsatzMitteilungSenden(input: {
  einsatzId: string;
  typ: EinsatzMeldungTyp;
  text: string;
  stunden?: string | number | null;
  dateien?: HochgeladeneDatei[];
}): Promise<Result> {
  const auth = await einsatzZugriff();
  if (!auth.ok) return auth;
  const einsatzId = input.einsatzId.trim();
  const typ: EinsatzMeldungTyp = input.typ === "regie" ? "regie" : "update";
  if (auth.mitarbeiterId && typ === "regie") return { ok: false, error: "Regie meldet der Inhaber Ihres Betriebs." };
  const text = input.text.trim();
  const stundenRaw = Number(String(input.stunden ?? "").replace(",", "."));
  const stunden = Number.isFinite(stundenRaw) && stundenRaw > 0 ? Math.round(stundenRaw * 100) / 100 : null;
  const e = await einsatzFuerZugriff(auth, einsatzId);
  if (!e) return { ok: false, error: "Einsatz nicht gefunden." };
  if (e.status !== "angenommen") return { ok: false, error: "Updates sind möglich, solange der Einsatz läuft." };
  const dateien = pruefeDateien(input.dateien, auth.handwerkerId, einsatzId, "mitteilung");
  if (!dateien.ok) return dateien;
  if (typ === "update" ? !text && dateien.dateien.length === 0 : !text) {
    return {
      ok: false,
      error: typ === "update" ? "Bitte einen Text oder ein Foto hinzufügen." : "Bitte kurz beschreiben, was gemacht wurde.",
    };
  }
  if (typ === "regie" && !stunden) return { ok: false, error: "Bitte die Stunden für die Regie angeben." };

  const { error } = await supabaseAdmin.from("einsatz_mitteilungen").insert({
    einsatz_id: einsatzId,
    auftrag_id: e.auftrag_id,
    handwerker_id: auth.handwerkerId,
    typ,
    text,
    stunden: typ === "regie" ? stunden : null,
    dateien: dateien.dateien,
  });
  if (error) {
    logDbError("app/actions/partner-einsatz:mitteilung", error);
    return { ok: false, error: "Update konnte nicht gesendet werden." };
  }
  return done();
}

const DOKUMENT_ARTEN = ["angebot", "rechnung", "protokoll", "sonstiges"] as const;
type DokumentArt = (typeof DOKUMENT_ARTEN)[number];

/**
 * Dokument zum Einsatz (04.10.2026): Art Angebot / Rechnung / Protokoll / Sonstiges.
 * Rechnung → Partner-Rechnung am Einsatz (CRM markiert bezahlt); alles andere → Dokumente des Vorgangs
 * (der Server kopiert die Datei dorthin — ohne Umweg über Netlify).
 */
export async function einsatzDokumentHochladen(input: {
  einsatzId: string;
  art: string;
  datei: HochgeladeneDatei | null;
}): Promise<Result> {
  const auth = await partnerAuth();
  if (!auth.ok) return auth;
  const einsatzId = input.einsatzId.trim();
  const art: DokumentArt = DOKUMENT_ARTEN.includes(input.art as DokumentArt) ? (input.art as DokumentArt) : "sonstiges";
  if (!input.datei) return { ok: false, error: "Bitte eine Datei wählen." };
  const e = await eigenerEinsatz(auth.handwerkerId, einsatzId);
  if (!e) return { ok: false, error: "Einsatz nicht gefunden." };
  if (e.status !== "angenommen" && e.status !== "fertig") {
    return { ok: false, error: "Dokumente sind möglich, sobald Sie den Einsatz angenommen haben." };
  }

  if (art === "rechnung") {
    if (e.rechnung_eingereicht_at) return { ok: false, error: "Die Rechnung ist bereits hochgeladen." };
    if (input.datei.mime !== "application/pdf") return { ok: false, error: "Bitte die Rechnung als PDF hochladen." };
    const re = pruefeDateien([input.datei], auth.handwerkerId, einsatzId, "rechnung");
    if (!re.ok) return re;
    const { error } = await supabaseAdmin
      .from("einsaetze")
      .update({ ...rechnungPatch(input.datei.path), updated_at: new Date().toISOString() })
      .eq("id", einsatzId)
      .eq("handwerker_id", auth.handwerkerId);
    if (error) {
      logDbError("app/actions/partner-einsatz:dokument-rechnung", error);
      return { ok: false, error: "Rechnung konnte nicht gespeichert werden." };
    }
    return done();
  }

  const geprueft = pruefeDateien([input.datei], auth.handwerkerId, einsatzId, "dokument");
  if (!geprueft.ok) return geprueft;
  const { data: auf, error: aufErr } = await supabaseAdmin
    .from("auftraege")
    .select("lead_id")
    .eq("id", e.auftrag_id as string)
    .maybeSingle();
  if (aufErr) logDbError("app/actions/partner-einsatz:dokument-auftrag", aufErr);
  const leadId = String(auf?.lead_id ?? "").trim();
  if (!leadId) return { ok: false, error: "Vorgang nicht gefunden." };
  // Aus dem Partner-Ordner in die Dokumente des Vorgangs kopieren
  const { data: blob, error: dlErr } = await supabaseAdmin.storage.from(PARTNER_UPLOAD_BUCKET).download(input.datei.path);
  if (dlErr || !blob) {
    logDbError("app/actions/partner-einsatz:dokument-download", dlErr);
    return { ok: false, error: "Datei konnte nicht gelesen werden. Bitte erneut hochladen." };
  }
  const safe = (input.datei.name || "dokument").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-80);
  const path = `${leadId}/partner-${auth.handwerkerId.slice(0, 8)}-${Date.now()}-${safe}`;
  const { error: upErr } = await supabaseAdmin.storage
    .from("lead-dokumente")
    .upload(path, Buffer.from(await blob.arrayBuffer()), { contentType: input.datei.mime, upsert: false });
  if (upErr) {
    logDbError("app/actions/partner-einsatz:dokument-upload", upErr);
    return { ok: false, error: "Datei konnte nicht gespeichert werden." };
  }
  const { data: pub } = supabaseAdmin.storage.from("lead-dokumente").getPublicUrl(path);
  const { error: insErr } = await supabaseAdmin.from("lead_dokumente").insert({
    lead_id: leadId,
    name: input.datei.name || "Dokument",
    datei_url: pub.publicUrl,
    groesse_bytes: input.datei.size,
    art,
    von: "partner",
    handwerker_id: auth.handwerkerId,
  });
  if (insErr) {
    logDbError("app/actions/partner-einsatz:dokument-insert", insErr);
    return { ok: false, error: "Dokument konnte nicht gespeichert werden." };
  }
  return done();
}

/** Einsatz aus Sicht des Mitarbeiters — ohne EK, ohne Rechnung. */
export type MitarbeiterEinsatz = {
  id: string;
  titel: string;
  anweisung: string | null;
  anweisung_fotos: string[];
  termin_von: string | null;
  termin_bis: string | null;
  ort: string | null;
  kontakt_vor_ort: string | null;
  status: "angenommen" | "fertig";
  fertig_at: string | null;
};

/** Nur für eingeloggte Mitarbeiter: ihnen zugeordnete, angenommene oder erledigte Einsätze. */
export async function listMitarbeiterEinsaetze(): Promise<
  { ok: true; einsaetze: MitarbeiterEinsatz[] } | { ok: false; error: string }
> {
  const auth = await einsatzZugriff();
  if (!auth.ok) return auth;
  if (!auth.mitarbeiterId) return { ok: false, error: "Nur für Mitarbeiter." };
  const { data, error } = await supabaseAdmin
    .from("einsaetze")
    .select("id, auftrag_id, titel, anweisung, anweisung_fotos, termin_von, termin_bis, ort, kontakt_vor_ort, status, fertig_at")
    .eq("handwerker_id", auth.handwerkerId)
    .eq("mitarbeiter_id", auth.mitarbeiterId)
    .in("status", ["angenommen", "fertig"])
    .order("termin_von", { ascending: true, nullsFirst: false })
    .limit(100);
  if (error) {
    logDbError("app/actions/partner-einsatz:mitarbeiter-liste", error);
    return { ok: false, error: "Einsätze konnten nicht geladen werden." };
  }
  const sichtbar = await sichtbareEinsatzIds(
    (data ?? []).map((r) => ({ id: String(r.id), auftrag_id: String(r.auftrag_id), status: String(r.status) }))
  );
  return {
    ok: true,
    einsaetze: (data ?? [])
      .filter((r) => sichtbar.has(String(r.id)))
      .map((r) => ({
        id: String(r.id),
        titel: String(r.titel ?? ""),
        anweisung: (r.anweisung as string | null) ?? null,
        anweisung_fotos: Array.isArray(r.anweisung_fotos)
          ? (r.anweisung_fotos as unknown[]).map((u) => String(u ?? "")).filter((u) => /^https:\/\//i.test(u))
          : [],
        termin_von: (r.termin_von as string | null) ?? null,
        termin_bis: (r.termin_bis as string | null) ?? null,
        ort: (r.ort as string | null) ?? null,
        kontakt_vor_ort: (r.kontakt_vor_ort as string | null) ?? null,
        status: r.status === "fertig" ? "fertig" : "angenommen",
        fertig_at: (r.fertig_at as string | null) ?? null,
      })),
  };
}
