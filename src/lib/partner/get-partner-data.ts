import { isPartnerAuftragAnfrageAktionErforderlich } from "@/lib/partner/partner-anfrage-status";
import {
  buildPartnerOffenListe,
  isPartnerAngebotOffenListItem,
} from "@/lib/partner/partner-offen-status";
import {
  aggregateAuftragHandwerkerStatus,
  resolveAuftragPortalPhase,
  type PartnerPortalPhase,
} from "@/lib/partner/partner-portal-phase";
import {
  mapAngebotHandwerkerRow,
  PARTNER_ANGEBOT_EMBED,
  PARTNER_LEAD_EMBED,
} from "@/lib/partner/map-partner-anfrage-handwerker";
import {
  buildPartnerLeadSource,
  collectPartnerObjektIds,
  type PartnerKundenObjektRow,
  type PartnerLeadDbRow,
} from "@/lib/partner/partner-lead-source";
import {
  extractPartnerLeadGateFromAngebotHandwerkerRow,
  extractPartnerLeadGateFromAuftragRow,
  isPartnerBlockedByOrgFreigabe,
} from "@/lib/partner/partner-org-freigabe";
import type { PortalAnfrageLeadSource } from "@/lib/portal/portal-anfrage-display";
import {
  isPrivatPortalKontext,
  resolvePrivatPortalTitel,
} from "@/lib/portal/portal-titel";
import { resolveHandwerkerAnsprechpartner } from "@/lib/partner/handwerker-ansprechpartner";
import { parseHwAnhangStoragePaths } from "@/lib/partner/partner-hw-dokument-typen";
import {
  resolvePartnerFileUrl,
} from "@/lib/partner/partner-storage";
import { createPartnerSignedUrlCache } from "@/lib/partner/partner-signed-url-cache";
import type { PartnerAuftragBewertung } from "@/lib/partner/handwerker-bewertung-display";
import type { PartnerHandwerkerBewertungProfil } from "@/lib/partner/handwerker-bewertung-display";
import type { PartnerComplianceItem } from "@/lib/partner/partner-compliance";
import {
  partnerHatMeisterGewerke,
  partnerLeistetBauleistung,
} from "@/lib/partner/compliance-partner-profile";
import { buildPartnerAufgaben, type PartnerAufgabeItem } from "@/lib/partner/build-partner-aufgaben";
import {
  buildPartnerVorgaenge,
  type PartnerVorgangItem,
} from "@/lib/partner/build-partner-vorgaenge";
import { ensurePartnerBautagebuchNotifications } from "@/lib/partner/notify-partner-bautagebuch-anfrage";
import { ensurePartnerOffenNotifications } from "@/lib/partner/notify-partner-offen";
import { buildPartnerTermine, type PartnerTerminItem } from "@/lib/partner/build-partner-termine";
import {
  applyRahmenvertragPortalAkzeptanz,
  buildBauauftragComplianceItems,
  buildOffeneLeistungsUnterlagen,
  type PartnerOffeneLeistungsUnterlage,
  type PartnerRahmenvertrag,
} from "@/lib/partner/compliance-summary";
import {
  loadHandwerkerComplianceBundle,
  loadRahmenvertrag,
  vertragKontextForAngebot,
  type PartnerVertragKontext,
} from "@/lib/partner/load-partner-compliance-data";
import type { PartnerProjektvertrag } from "@/lib/partner/partner-compliance";
import { resolvePartnerListenTitel } from "@/lib/partner/partner-listen-titel";
import { acceptCrmRahmenvertragLoggedIn } from "@/lib/partner/partner-crm-api";
import { persistPortalRahmenvertragAkzeptanz } from "@/lib/partner/persist-portal-rahmenvertrag";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";
import { stripHtmlToPlainText } from "@/lib/portal/portal-display";
import type { PartnerHwKonditionen } from "@/lib/partner/partner-konditionen";
import {
  filterOffeneNachreichungPositionIds,
  resolveNachreichungOpenZeilenIds,
  resolveOffeneAuftragPositionIdsByStatus,
} from "@/lib/partner/partner-konditionen";
import { pickPrimaryAngebotHandwerkerAnfrage } from "@/lib/partner/pick-primary-angebot-handwerker";

export type PartnerAnfrageItem = {
  id: string;
  angebot_id: string;
  status: string;
  gewerk_name: string;
  /** Gewerk-UUID aus angebot_handwerker (Filter für CRM-Positionen). */
  gewerk_id?: string;
  /** Handwerker-UUID (Filter für CRM-Positionen bei Nachreichung). */
  handwerker_id?: string;
  angebot_titel: string;
  /** Einheitlich: „Gewerk — PLZ Ort“ (Partner-Listen & Detail). */
  listen_titel: string;
  gesendet_at?: string | null;
  antwort_at?: string | null;
  antwort_notiz?: string;
  ablehnung_grund?: string;
  aufgabe_notiz?: string;
  plz: string;
  ort: string;
  zeitraum: string;
  positionen: Array<{
    leistung: string;
    beschreibung?: string;
    menge: number;
    einheit?: string;
  }>;
  hw_status?: string;
  hw_eingereicht_at?: string;
  /** Zeitpunkt der verbindlichen Auftragsannahme (Tab Offen). */
  bestaetigt_at?: string | null;
  hw_preis_netto?: number | null;
  hw_preis_brutto?: number | null;
  hw_angebot_pdf_url?: string | null;
  hw_angebot_pdf_signed_url?: string | null;
  hw_angebot_anhang_urls?: string[];
  hw_angebot_anhang_signed_urls?: string[];
  hw_rechnung_pdf_url?: string | null;
  hw_rechnung_pdf_signed_url?: string | null;
  hw_rechnung_eingereicht_at?: string;
  hw_notiz?: string | null;
  hw_crm_notiz?: string | null;
  hw_crm_antwort_at?: string | null;
  hw_konditionen?: PartnerHwKonditionen | null;
  lead?: PortalAnfrageLeadSource | null;
  crm_positionen_raw?: unknown;
  /** Auftragspositionen zum Angebot (CRM-Nachreichung nur im Auftrag). */
  crm_auftrag_positionen?: PartnerAuftragPosition[];
  /** Vom Auftrag vorberechnete offene Positions-IDs (Nachreichung). */
  nachreichung_open_position_ids?: string[];
  /** Alle hw_konditionen-Zeilen zum Angebot (Multi-Gewerk). */
  alle_hw_konditionen?: Array<PartnerHwKonditionen | null | undefined>;
  crm_gesamt_fix?: number | null;
  crm_gesamt_min?: number | null;
  crm_gesamt_max?: number | null;
  /** Leistungsumfang aus CRM-Angebot (wizard_meta in Notizen). */
  crm_leistungsumfang?: string | null;
  auftrag_id?: string | null;
  /** Status des verknüpften Auftrags (z. B. offen = noch in Angebote, in_arbeit = Aufträge). */
  auftrag_status?: string | null;
  projektvertrag_bestaetigt_am?: string | null;
  projektvertrag_bereit?: boolean;
  projektvertrag?: PartnerProjektvertrag | null;
  compliance_stamm?: PartnerComplianceItem[];
  compliance_projekt?: PartnerComplianceItem[];
  /** Nachweise laut Nachunternehmervertrag — nur Bauprojekt */
  compliance_bauauftrag?: PartnerComplianceItem[];
  /** Aus gewerke.ist_bauleistung der Auftragspositionen — nicht das HW-Profil. */
  ist_bauprojekt?: boolean;
  dokumente?: PartnerVertragKontext["dokumente_zeilen"];
};

export type PartnerAuftragPosition = {
  id: string;
  gewerk_name: string;
  leistung_name: string;
  beschreibung: string | null;
  menge: number | null;
  einheit: string | null;
  start_datum: string | null;
  end_datum: string | null;
  preis_partner?: number | null;
  lohn_fix?: number | null;
  material_fix?: number | null;
  /** Regie: €/h netto — nicht mit preis_partner (Zeile) verwechseln. */
  stundensatz?: number | null;
  /** CRM-Zuweisungsstatus dieser Leistung (z. B. angefragt nach Nachreichung). */
  handwerker_status?: string | null;
  handwerker_id?: string | null;
  /** Lebenszyklus: offen | in_arbeit | erledigt (= leistung_status). */
  leistung_status?: string | null;
  typ?: string | null;
  verguetung?: string | null;
  anerkennung_status?: string | null;
  gestartet_am?: string | null;
  erledigt_am?: string | null;
  zeit_minuten_summe?: number | null;
  /** CRM-Änderungstyp — null nach HW-Bestätigung. */
  aenderung_typ?: "neu" | "geaendert" | "entfernt" | null;
  preis_alt?: number | null;
};

export type PartnerBautagebuchItem = {
  id: string;
  titel: string;
  beschreibung: string | null;
  datum: string;
  foto_urls: string[];
  foto_signed_urls: string[];
  fuer_kunde_freigegeben: boolean;
  eintrag_typ: "tagebuch" | "befund";
  own: boolean;
  handwerker_id: string | null;
};

export type PartnerAuftragItem = {
  id: string;
  titel: string;
  listen_titel: string;
  status: string;
  fortschritt: number | null;
  start_datum: string | null;
  end_datum: string | null;
  /** DB-Zeitstempel — für „Zuletzt“ / Sortierung. */
  created_at?: string | null;
  updated_at?: string | null;
  angebot_id: string | null;
  plz: string;
  ort: string;
  lead?: PortalAnfrageLeadSource | null;
  positionen: PartnerAuftragPosition[];
  bautagebuch: PartnerBautagebuchItem[];
  /** Server-seitige Menü-Zuordnung (anfrage | auftrag). */
  portalPhase: PartnerPortalPhase;
  /** Aggregierter Zuweisungs-Status dieses Handwerkers am Auftrag. */
  hwStatus: string;
  /** Verknüpftes angebot_handwerker für Preis/PDF (nach Auftrags-Annahme). */
  angebotHandwerkerId?: string | null;
  angebotHwStatus?: string | null;
  angebotHwEingereichtAt?: string | null;
  angebotHwKonditionenArt?: "bestaetigt" | "gegenvorschlag" | null;
  /** Aufgabe-/CRM-Notiz aus verknüpftem angebot_handwerker. */
  aufgabe_notiz?: string | null;
  hw_crm_notiz?: string | null;
  /** CRM-Bewertung nach Abschluss (read-only). */
  bewertung?: PartnerAuftragBewertung | null;
  /** Verbindliche HW-Annahme auf Auftragsebene. */
  handwerker_bestaetigt_at?: string | null;
  projektvertrag_bestaetigt_am?: string | null;
  vertrag?: PartnerVertragKontext | null;
  /** Offene CRM-Anforderung für Bautagebuch-Eintrag. */
  bautagebuchAnfrageOffen?: boolean;
  bautagebuchAnfrageId?: string | null;
  /** Optionale Notiz zur offenen Tagebuch-Anforderung. */
  bautagebuchAnfrageNotiz?: string | null;
  /** Vorausgewählte Positions-IDs aus CRM-Anforderung. */
  bautagebuchAnfragePositionIds?: string[];
  /** Auftragspositionen, die noch unter Offen bestätigt werden müssen (Nachreichung). */
  nachreichungOpenPositionIds?: string[];
  /** Verknüpftes angebot_handwerker — HW-Unterlagen & Rechnung. */
  hw_angebot_pdf_url?: string | null;
  hw_angebot_pdf_signed_url?: string | null;
  hw_angebot_anhang_urls?: string[];
  hw_angebot_anhang_signed_urls?: string[];
  hw_rechnung_pdf_url?: string | null;
  hw_rechnung_pdf_signed_url?: string | null;
  hw_rechnung_eingereicht_at?: string | null;
  /** F1/F4 — Eigene Teilabnahme signiert (auftrag_handwerker.abnahme_signiert_am) */
  hw_abschluss_signiert_am?: string | null;
  /** Eigenes Teilabnahme-Protokoll (nicht globales Gesamtdokument) */
  abnahme_protokoll_id?: string | null;
  abnahme_protokoll_url?: string | null;
  abnahme_datum?: string | null;
  /** CRM-Freigabe der eigenen Teilabnahme */
  abnahme_freigabe_status?: string | null;
  /** Fachnachweise (Mess-/Prüfprotokolle) — soft, kein Gate */
  fachdokuSlots?: Array<{
    id: string;
    slot_code: string;
    label: string;
    status: string;
    datei_url?: string | null;
    datei_name?: string | null;
    signed_url?: string | null;
    erledigt_am?: string | null;
    uploaded_by_role?: string | null;
  }>;
};

export type PartnerHandwerkerProfil = {
  /** Vollständiger Name (Vorname + Nachname) — z. B. für E-Mails. */
  name: string;
  vorname: string;
  nachname: string;
  firma: string | null;
  email: string | null;
  telefon: string | null;
  webseite: string | null;
  adresse: string | null;
  /** Firmensitz — Angebote/Rechnungen. */
  strasse?: string | null;
  hausnummer?: string | null;
  plz?: string | null;
  ort?: string | null;
  steuernummer: string | null;
  ustid: string | null;
  handelsregister?: string | null;
  iban: string | null;
  bic?: string | null;
  bank?: string | null;
  /** Firmenlogo (Storage-Pfad oder URL). */
  logo_url?: string | null;
  logo_signed_url?: string | null;
  kleinunternehmer?: boolean;
  gewerke: string[];
  gewerkNamen: string[];
  bewertung: PartnerHandwerkerBewertungProfil;
};

export type PartnerProfilKontext = {
  allgemein: PartnerComplianceItem[];
  meister: PartnerComplianceItem[];
  stamm: PartnerComplianceItem[];
  profil: { leistet_bauleistung: boolean; hat_meister_gewerke: boolean };
  rahmenvertrag: PartnerRahmenvertrag | null;
  offeneLeistungsunterlagen: PartnerOffeneLeistungsUnterlage[];
};

export type PartnerTodoItem = {
  id: string;
  titel: string;
  erledigt: boolean;
  sort_order: number;
  created_at: string;
};

export type PartnerBautagebuchAnfrageItem = {
  id: string;
  auftrag_id: string;
  notiz: string | null;
  created_at: string;
  position_ids?: string[];
};

export type { PartnerAufgabeItem, PartnerTerminItem, PartnerVorgangItem };

function one<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null;
  return Array.isArray(x) ? (x[0] as T) ?? null : x;
}

function parseHwAnhangUrls(raw: unknown, fallbackPath: string | null): string[] {
  return parseHwAnhangStoragePaths(raw, fallbackPath);
}

async function mapHwAngebotAnhaenge(
  raw: Record<string, unknown>,
  resolveFile: (p: string | null | undefined) => Promise<string | null> = resolvePartnerFileUrl
) {
  const pdfPath = (raw.hw_angebot_pdf_url as string | null) ?? null;
  const anhangPaths = parseHwAnhangUrls(raw.hw_angebot_anhang_urls, pdfPath);
  const signed = (
    await Promise.all(anhangPaths.map((p) => resolveFile(p)))
  ).filter((u): u is string => Boolean(u));
  return {
    hw_angebot_pdf_url: pdfPath,
    hw_angebot_pdf_signed_url: signed[0] ?? null,
    hw_angebot_anhang_urls: anhangPaths,
    hw_angebot_anhang_signed_urls: signed,
  };
}

function uniqueIds(ids: string[]): string[] {
  return Array.from(new Set(ids.filter(Boolean)));
}

function numOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const ANGEBOT_HANDWERKER_BASE_SELECT = `
  id,
  angebot_id,
  handwerker_id,
  gewerk_id,
  status,
  gesendet_at,
  antwort_at,
  antwort_notiz,
  ablehnung_grund,
  aufgabe_notiz,
  hw_status,
  hw_eingereicht_at,
  hw_preis_netto,
  hw_preis_brutto,
  hw_angebot_pdf_url,
  hw_angebot_anhang_urls,
  hw_rechnung_pdf_url,
  hw_rechnung_eingereicht_at,
  hw_notiz,
  hw_crm_notiz,
  hw_crm_antwort_at,
  hw_konditionen,
  bestaetigt_at,
  gewerke(name),
  angebote(${PARTNER_ANGEBOT_EMBED})
`;

async function loadPartnerObjektById(
  objektIds: string[]
): Promise<Map<string, PartnerKundenObjektRow>> {
  const objektById = new Map<string, PartnerKundenObjektRow>();
  if (!objektIds.length) return objektById;

  const { data: objekteRows } = await supabaseAdmin
    .from("kunden_objekte")
    .select("id, titel, strasse, hausnummer, plz, ort, cover_url, einheiten_hinweis")
    .in("id", objektIds);

  for (const o of objekteRows ?? []) {
    const raw = o as { id: string };
    objektById.set(String(raw.id), o as PartnerKundenObjektRow);
  }
  return objektById;
}

function collectObjektIdsFromAngebotHandwerkerRows(
  rows: Array<Record<string, unknown>>
): string[] {
  const ids: string[] = [];
  for (const row of rows) {
    const angebote = one(row.angebote) as {
      kunde_objekt_id?: string | null;
      leads?: PartnerLeadDbRow | PartnerLeadDbRow[] | null;
    } | null;
    const lead = angebote ? one(angebote.leads) : null;
    ids.push(
      ...collectPartnerObjektIds(
        angebote?.kunde_objekt_id,
        lead?.kunde_objekt_id
      )
    );
  }
  return uniqueIds(ids);
}

async function mapAngebotHandwerkerRows(
  rows: Array<Record<string, unknown>>,
  objektById: Map<string, PartnerKundenObjektRow>,
  resolveFile: (p: string | null | undefined) => Promise<string | null> = resolvePartnerFileUrl
): Promise<PartnerAnfrageItem[]> {
  const mapAnhaenge = (raw: Record<string, unknown>) =>
    mapHwAngebotAnhaenge(raw, resolveFile);
  return Promise.all(
    rows.map((row) =>
      mapAngebotHandwerkerRow(
        row,
        objektById,
        mapAnhaenge,
        resolveFile
      )
    )
  );
}

export async function getPartnerDataForHandwerker(
  handwerkerId: string,
  opts?: { mode?: "list" | "full" }
) {
  if (!isSupabaseConfigured()) return null;

  const id = handwerkerId.trim();
  if (!id) return null;
  const listMode = (opts?.mode ?? "list") !== "full";
  const signedCache = createPartnerSignedUrlCache();
  /** Listen: keine Storage-Roundtrips; Detail hydrated via /api/partner/signed-urls. */
  const resolveUrlListSafe = (p: string | null | undefined) =>
    listMode
      ? Promise.resolve(
          p && /^https?:\/\//i.test(p.trim()) ? p.trim() : (null as string | null)
        )
      : signedCache.resolve(p);

  const handwerkerSelectFull = `
      id,
      name,
      vorname,
      nachname,
      firma,
      email,
      telefon,
      webseite,
      adresse,
      strasse,
      hausnummer,
      plz,
      ort,
      steuernummer,
      ustid,
      handelsregister,
      iban,
      bic,
      bank,
      logo_url,
      kleinunternehmer,
      gewerke,
      bewertung_gesamt,
      bewertung_qualitaet,
      bewertung_termintreue,
      bewertung_sauberkeit,
      bewertung_kommunikation,
      bewertung_preis_leistung,
      bewertung_anzahl
    `;
  const handwerkerSelectBase = `
      id,
      name,
      vorname,
      nachname,
      firma,
      email,
      telefon,
      webseite,
      adresse,
      steuernummer,
      ustid,
      iban,
      gewerke,
      bewertung_gesamt,
      bewertung_qualitaet,
      bewertung_termintreue,
      bewertung_sauberkeit,
      bewertung_kommunikation,
      bewertung_preis_leistung,
      bewertung_anzahl
    `;

  let { data: handwerker, error: hwLoadErr } = await supabaseAdmin
    .from("handwerker")
    .select(handwerkerSelectFull)
    .eq("id", id)
    .maybeSingle();

  if (
    hwLoadErr &&
    /strasse|hausnummer|plz|ort|handelsregister|bic|bank|logo_url|kleinunternehmer/i.test(
      hwLoadErr.message
    )
  ) {
    ({ data: handwerker, error: hwLoadErr } = await supabaseAdmin
      .from("handwerker")
      .select(handwerkerSelectBase)
      .eq("id", id)
      .maybeSingle());
  }
  if (hwLoadErr) {
    console.warn("[partner] handwerker laden:", hwLoadErr.message);
  }

  if (!handwerker) return null;

  const { data: rows, error: anfragenRowsError } = await supabaseAdmin
    .from("angebot_handwerker")
    .select(ANGEBOT_HANDWERKER_BASE_SELECT)
    .eq("handwerker_id", id)
    .order("gesendet_at", { ascending: false });

  if (anfragenRowsError) {
    console.error(
      "[partner] angebot_handwerker laden fehlgeschlagen:",
      anfragenRowsError.message
    );
  }

  const rawRows = (rows ?? []) as Array<Record<string, unknown>>;
  const objektById = await loadPartnerObjektById(
    collectObjektIdsFromAngebotHandwerkerRows(rawRows)
  );
  const anfragen: PartnerAnfrageItem[] = (
    await mapAngebotHandwerkerRows(rawRows, objektById, signedCache.resolve)
  ).filter((_, i) => {
    const row = rawRows[i]!;
    const gate = extractPartnerLeadGateFromAngebotHandwerkerRow(row);
    if (!isPartnerBlockedByOrgFreigabe(gate)) return true;
    return Boolean((row.gesendet_at as string | null | undefined)?.trim());
  });

  const { data: hwAuftraege } = await supabaseAdmin
    .from("auftrag_handwerker")
    .select("auftrag_id, status, abnahme_signiert_am, abnahme_protokoll_id")
    .eq("handwerker_id", id);

  const { data: posAuftraege } = await supabaseAdmin
    .from("auftrag_positionen")
    .select("auftrag_id, handwerker_status")
    .eq("handwerker_id", id);

  const hwStatusByAuftrag = new Map<string, string[]>();
  const posStatusByAuftrag = new Map<string, string[]>();
  const abnahmeByAuftrag = new Map<
    string,
    { signiertAm: string | null; protokollId: string | null }
  >();

  for (const r of hwAuftraege ?? []) {
    const row = r as {
      auftrag_id: string;
      status?: string;
      abnahme_signiert_am?: string | null;
      abnahme_protokoll_id?: string | null;
    };
    const aid = String(row.auftrag_id);
    const list = hwStatusByAuftrag.get(aid) ?? [];
    list.push(String(row.status ?? "ausstehend"));
    hwStatusByAuftrag.set(aid, list);
    abnahmeByAuftrag.set(aid, {
      signiertAm: row.abnahme_signiert_am ?? null,
      protokollId: row.abnahme_protokoll_id ?? null,
    });
  }
  for (const r of posAuftraege ?? []) {
    const aid = String((r as { auftrag_id: string }).auftrag_id);
    const st = (r as { handwerker_status?: string | null }).handwerker_status;
    if (!st?.trim()) continue;
    const list = posStatusByAuftrag.get(aid) ?? [];
    list.push(st);
    posStatusByAuftrag.set(aid, list);
  }

  const auftragIds = uniqueIds([
    ...(hwAuftraege ?? []).map((r) => String((r as { auftrag_id: string }).auftrag_id)),
    ...(posAuftraege ?? []).map((r) => String((r as { auftrag_id: string }).auftrag_id)),
  ]);

  let alleAuftraege: PartnerAuftragItem[] = [];
  const auftragAngebotIdByAuftragId = new Map<string, string>();

  if (auftragIds.length) {
    const { data: aufRows } = await supabaseAdmin
      .from("auftraege")
      .select(
        `
        id,
        angebot_id,
        lead_id,
        titel,
        status,
        fortschritt,
        start_datum,
        end_datum,
        handwerker_bestaetigt_at,
        abnahme_protokoll_url,
        abnahme_datum,
        created_at,
        updated_at,
        kunden(plz, ort, name),
        leads(${PARTNER_LEAD_EMBED}),
        angebote(kunde_objekt_id),
        auftrag_positionen(
          id,
          gewerk_name,
          leistung_name,
          beschreibung,
          menge,
          einheit,
          handwerker_id,
          handwerker_status,
          leistung_status,
          typ,
          verguetung,
          anerkennung_status,
          gestartet_am,
          erledigt_am,
          start_datum,
          end_datum,
          preis_partner,
          lohn_fix,
          material_fix,
          aenderung_typ,
          preis_alt,
          zeit_minuten_summe,
          stundensatz
        )
      `
      )
      .in("id", auftragIds)
      .order("created_at", { ascending: false });

    const { data: btRows } = await supabaseAdmin
      .from("auftrag_bautagebuch_eintraege")
      .select(
        "id, auftrag_id, titel, beschreibung, datum, foto_urls, fuer_kunde_freigegeben, handwerker_id, eintrag_typ"
      )
      .in("auftrag_id", auftragIds)
      .order("datum", { ascending: false });

    const btByAuftrag = new Map<string, PartnerBautagebuchItem[]>();
    const bewertungByAuftragId = new Map<string, PartnerAuftragBewertung>();

    const { data: bewertungen } = await supabaseAdmin
      .from("handwerker_bewertungen")
      .select(
        "auftrag_id, qualitaet, termintreue, sauberkeit, kommunikation, preis_leistung, updated_at"
      )
      .eq("handwerker_id", id)
      .in("auftrag_id", auftragIds);

    for (const b of bewertungen ?? []) {
      const raw = b as Record<string, unknown>;
      const aid = String(raw.auftrag_id);
      bewertungByAuftragId.set(aid, {
        qualitaet: Number(raw.qualitaet),
        termintreue: Number(raw.termintreue),
        sauberkeit: Number(raw.sauberkeit),
        kommunikation: Number(raw.kommunikation),
        preis_leistung: Number(raw.preis_leistung),
        updated_at: (raw.updated_at as string | null) ?? null,
      });
    }

    const btMapped = await Promise.all(
      (btRows ?? []).map(async (bt) => {
        const r = bt as Record<string, unknown>;
        const aid = String(r.auftrag_id);
        const paths = Array.isArray(r.foto_urls)
          ? (r.foto_urls as string[]).map((s) => String(s).trim()).filter(Boolean)
          : [];
        const signed = listMode
          ? paths.filter((p) => /^https?:\/\//i.test(p))
          : await signedCache.resolveMany(paths);
        const item: PartnerBautagebuchItem = {
          id: String(r.id),
          titel: String(r.titel ?? ""),
          beschreibung: (r.beschreibung as string | null) ?? null,
          datum: String(r.datum).slice(0, 10),
          foto_urls: paths,
          foto_signed_urls: signed,
          fuer_kunde_freigegeben: Boolean(r.fuer_kunde_freigegeben),
          eintrag_typ: (r.eintrag_typ as "tagebuch" | "befund") ?? "tagebuch",
          own: String(r.handwerker_id ?? "") === id,
          handwerker_id: (r.handwerker_id as string | null) ?? null,
        };
        return { aid, item };
      })
    );
    for (const { aid, item } of btMapped) {
      const list = btByAuftrag.get(aid) ?? [];
      list.push(item);
      btByAuftrag.set(aid, list);
    }

    const auftragObjektIds = uniqueIds(
      (aufRows ?? []).flatMap((row) => {
        const raw = row as Record<string, unknown>;
        const leadRow = one(raw.leads) as PartnerLeadDbRow | null;
        const angebot = one(raw.angebote) as { kunde_objekt_id?: string | null } | null;
        return collectPartnerObjektIds(
          leadRow?.kunde_objekt_id,
          angebot?.kunde_objekt_id
        );
      })
    );
    const auftragObjektById = await loadPartnerObjektById(auftragObjektIds);

    const ownProtokollIds = uniqueIds(
      Array.from(abnahmeByAuftrag.values())
        .map((a) => a.protokollId)
        .filter((x): x is string => Boolean(x?.trim()))
    );
    const protoById = new Map<
      string,
      { freigabe_status: string | null; pdf_url: string | null; abnahme_datum: string | null }
    >();
    if (ownProtokollIds.length) {
      const { data: protoRows } = await supabaseAdmin
        .from("auftrag_abnahmeprotokolle")
        .select("id, freigabe_status, pdf_url, abnahme_datum")
        .in("id", ownProtokollIds);
      for (const p of protoRows ?? []) {
        const row = p as {
          id: string;
          freigabe_status?: string | null;
          pdf_url?: string | null;
          abnahme_datum?: string | null;
        };
        protoById.set(String(row.id), {
          freigabe_status: row.freigabe_status ?? null,
          pdf_url: row.pdf_url ?? null,
          abnahme_datum: row.abnahme_datum ?? null,
        });
      }
    }

    alleAuftraege = (aufRows ?? [])
      .filter((row) => {
        const raw = row as Record<string, unknown>;
        const gate = extractPartnerLeadGateFromAuftragRow(raw);
        if (!isPartnerBlockedByOrgFreigabe(gate)) return true;
        const aid = String(raw.id);
        if (hwStatusByAuftrag.has(aid)) return true;
        const positions = (raw.auftrag_positionen ?? []) as Array<{
          handwerker_id?: string | null;
        }>;
        return positions.some((p) => String(p.handwerker_id ?? "") === id);
      })
      .map((row) => {
      const raw = row as Record<string, unknown>;
      const kunde = one(raw.kunden) as {
        plz: string | null;
        ort: string | null;
        name?: string | null;
      } | null;
      const leadRow = one(raw.leads) as PartnerLeadDbRow | null;
      const angebot = one(raw.angebote) as { kunde_objekt_id?: string | null } | null;
      const lead = buildPartnerLeadSource({
        lead: leadRow,
        angebotObjektId: angebot?.kunde_objekt_id,
        kundePlz: kunde?.plz,
        kundeOrt: kunde?.ort,
        objektById: auftragObjektById,
      });
      const allPos = (raw.auftrag_positionen ?? []) as Array<Record<string, unknown>>;
      // handwerker_id reicht — Status kann nach CRM-Sync kurz leer sein.
      // Abgelehnte Positionen ausblenden; Rest inkl. Regie „in_pruefung“.
      const ownPos = allPos.filter((p) => {
        if (String(p.handwerker_id ?? "") !== id) return false;
        const st = String(p.handwerker_status ?? "")
          .trim()
          .toLowerCase();
        return st !== "abgelehnt";
      });
      const positionen = ownPos.map((p) => ({
        id: String(p.id),
        gewerk_name: String(p.gewerk_name ?? "Gewerk"),
        leistung_name: stripHtmlToPlainText(String(p.leistung_name ?? "")) || "Leistung",
        beschreibung: (() => {
          const raw = (p.beschreibung as string | null) ?? null;
          if (!raw?.trim()) return null;
          const plain = stripHtmlToPlainText(raw);
          return plain || null;
        })(),
        menge: p.menge != null ? Number(p.menge) : null,
        einheit: (p.einheit as string | null) ?? null,
        start_datum: (p.start_datum as string | null)?.slice(0, 10) ?? null,
        end_datum: (p.end_datum as string | null)?.slice(0, 10) ?? null,
        preis_partner:
          p.preis_partner != null ? Number(p.preis_partner) : null,
        stundensatz:
          p.stundensatz != null ? Number(p.stundensatz) : null,
        lohn_fix: p.lohn_fix != null ? Number(p.lohn_fix) : null,
        material_fix: p.material_fix != null ? Number(p.material_fix) : null,
        handwerker_status: (p.handwerker_status as string | null) ?? null,
        handwerker_id: (p.handwerker_id as string | null) ?? null,
        leistung_status: (p.leistung_status as string | null) ?? "offen",
        typ: (p.typ as string | null) ?? "lv",
        verguetung: (p.verguetung as string | null) ?? "festpreis",
        anerkennung_status:
          (p.anerkennung_status as string | null) ?? "nicht_noetig",
        gestartet_am: (p.gestartet_am as string | null) ?? null,
        erledigt_am: (p.erledigt_am as string | null) ?? null,
        zeit_minuten_summe:
          p.zeit_minuten_summe != null ? Number(p.zeit_minuten_summe) : null,
        aenderung_typ: (() => {
          const raw = (p.aenderung_typ as string | null)?.trim().toLowerCase();
          if (raw === "neu" || raw === "geaendert" || raw === "entfernt") {
            return raw as "neu" | "geaendert" | "entfernt";
          }
          return null;
        })(),
        preis_alt: p.preis_alt != null ? Number(p.preis_alt) : null,
      }));

      const aid = String(raw.id);
      const linkedAngebotId =
        raw.angebot_id != null ? String(raw.angebot_id).trim() : "";
      if (linkedAngebotId) {
        auftragAngebotIdByAuftragId.set(aid, linkedAngebotId);
      }
      const auftragStatus = String(raw.status ?? "—");
      const hwStatus = aggregateAuftragHandwerkerStatus(
        hwStatusByAuftrag.get(aid) ?? [],
        ownPos.map((p) => p.handwerker_status as string | null | undefined)
      );
      const portalPhase = resolveAuftragPortalPhase(auftragStatus, hwStatus);
      const roherTitel = String(raw.titel ?? "Auftrag").trim() || "Auftrag";
      const titel = resolvePrivatPortalTitel(roherTitel, {
        privat: isPrivatPortalKontext({
          auftraggeber_kunde_id: leadRow?.auftraggeber_kunde_id,
          situation: leadRow?.situation,
        }),
        nameCandidates: [kunde?.name, leadRow?.kontakt_name],
      });
      const listen_titel = resolvePartnerListenTitel({
        gewerk_names: positionen.map((p) => p.gewerk_name),
        plz: lead?.objekt?.plz?.trim() || kunde?.plz?.trim() || "—",
        ort: lead?.objekt?.ort?.trim() || kunde?.ort?.trim() || "—",
        lead,
        fallbackTitel: titel,
      });

      return {
        id: aid,
        titel,
        listen_titel,
        status: auftragStatus,
        fortschritt:
          raw.fortschritt != null && Number.isFinite(Number(raw.fortschritt))
            ? Number(raw.fortschritt)
            : null,
        start_datum: (raw.start_datum as string | null) ?? null,
        end_datum: (raw.end_datum as string | null) ?? null,
        created_at: (raw.created_at as string | null) ?? null,
        updated_at: (raw.updated_at as string | null) ?? null,
        angebot_id: linkedAngebotId || null,
        plz: lead?.objekt?.plz?.trim() || kunde?.plz?.trim() || "—",
        ort: lead?.objekt?.ort?.trim() || kunde?.ort?.trim() || "—",
        lead,
        positionen,
        bautagebuch: btByAuftrag.get(aid) ?? [],
        portalPhase,
        hwStatus,
        bewertung: bewertungByAuftragId.get(aid) ?? null,
        handwerker_bestaetigt_at:
          (raw.handwerker_bestaetigt_at as string | null)?.slice(0, 19) ?? null,
        hw_abschluss_signiert_am: (() => {
          const own = abnahmeByAuftrag.get(aid);
          return own?.signiertAm ?? null;
        })(),
        abnahme_protokoll_id: abnahmeByAuftrag.get(aid)?.protokollId ?? null,
        abnahme_protokoll_url: (() => {
          const pid = abnahmeByAuftrag.get(aid)?.protokollId;
          if (pid) {
            const proto = protoById.get(pid);
            if (proto?.pdf_url) return proto.pdf_url;
          }
          return (raw.abnahme_protokoll_url as string | null) ?? null;
        })(),
        abnahme_datum: (() => {
          const pid = abnahmeByAuftrag.get(aid)?.protokollId;
          if (pid) {
            const proto = protoById.get(pid);
            if (proto?.abnahme_datum) return proto.abnahme_datum;
          }
          return (raw.abnahme_datum as string | null) ?? null;
        })(),
        abnahme_freigabe_status: (() => {
          const pid = abnahmeByAuftrag.get(aid)?.protokollId;
          if (!pid) return null;
          return protoById.get(pid)?.freigabe_status ?? null;
        })(),
      };
    });
  }

  let anfragenFinal = anfragen;

  const complianceBundle = await loadHandwerkerComplianceBundle(id);
  let rahmenvertrag = await loadRahmenvertrag(id);

  if (!rahmenvertrag?.portal_akzeptiert_am) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const rvMeta = user?.user_metadata?.rv_akzeptiert_at;
    if (typeof rvMeta === "string" && rvMeta.trim()) {
      void acceptCrmRahmenvertragLoggedIn();
      const healed = await persistPortalRahmenvertragAkzeptanz({
        handwerkerId: id,
        authUserId: user?.id ?? null,
        akzeptiertAt: rvMeta,
      });
      if (healed.ok) {
        rahmenvertrag = await loadRahmenvertrag(id);
      }
    }
  }

  const auftragStatusById = new Map(alleAuftraege.map((a) => [a.id, a.status]));

  const alleHwKonditionenByAngebotId = new Map<
    string,
    Array<PartnerHwKonditionen | null | undefined>
  >();
  for (const a of anfragenFinal) {
    const list = alleHwKonditionenByAngebotId.get(a.angebot_id) ?? [];
    list.push(a.hw_konditionen);
    alleHwKonditionenByAngebotId.set(a.angebot_id, list);
  }

  anfragenFinal = anfragenFinal.map((a) => {
    const vertragCtx = vertragKontextForAngebot(a.angebot_id, complianceBundle);
    const auftragId = complianceBundle.auftragIdByAngebotId.get(a.angebot_id) ?? null;
    const auftragForAngebot = auftragId
      ? alleAuftraege.find((x) => x.id === auftragId)
      : undefined;
    return {
      ...a,
      auftrag_id: auftragId,
      auftrag_status: auftragId ? auftragStatusById.get(auftragId) ?? null : null,
      crm_auftrag_positionen: auftragForAngebot?.positionen,
      alle_hw_konditionen: alleHwKonditionenByAngebotId.get(a.angebot_id) ?? [],
      projektvertrag_bestaetigt_am: vertragCtx?.projektvertrag_bestaetigt_am ?? null,
      projektvertrag_bereit: vertragCtx?.projektvertrag_bereit ?? false,
      projektvertrag: vertragCtx?.projektvertrag ?? null,
      compliance_stamm: vertragCtx?.compliance_stamm ?? [],
      compliance_projekt: vertragCtx?.compliance_projekt ?? [],
      compliance_bauauftrag: vertragCtx?.compliance_bauauftrag ?? [],
      ist_bauprojekt: vertragCtx?.ist_bauprojekt ?? false,
      dokumente: vertragCtx?.dokumente_zeilen ?? [],
    };
  });

  const anfragenByAngebotId = new Map<string, typeof anfragenFinal>();
  for (const a of anfragenFinal) {
    const list = anfragenByAngebotId.get(a.angebot_id) ?? [];
    list.push(a);
    anfragenByAngebotId.set(a.angebot_id, list);
  }

  alleAuftraege = alleAuftraege.map((a) => {
    const angebotId = auftragAngebotIdByAuftragId.get(a.id);
    const anfragenForAngebot = angebotId
      ? anfragenByAngebotId.get(angebotId) ?? []
      : [];
    const anfrage = pickPrimaryAngebotHandwerkerAnfrage(anfragenForAngebot);
    const vertragCtx = complianceBundle.vertragByAuftragId.get(a.id) ?? null;

    const nachreichungOpenPositionIds = filterOffeneNachreichungPositionIds(
      a.positionen,
      Array.from(
        new Set([
          ...resolveOffeneAuftragPositionIdsByStatus(a.positionen),
          ...anfragenForAngebot.flatMap((af) =>
            resolveNachreichungOpenZeilenIds({
              crm_positionen_raw: af.crm_positionen_raw,
              crm_auftrag_positionen: a.positionen,
              filter: {
                gewerkId: af.gewerk_id,
                handwerkerId: af.handwerker_id,
                gewerkName: af.gewerk_name,
              },
              hw_konditionen: af.hw_konditionen,
              hw_status: af.hw_status,
              alle_hw_konditionen: af.alle_hw_konditionen,
            })
          ),
        ])
      )
    );

    return {
      ...a,
      angebotHandwerkerId: anfrage?.id ?? null,
      angebotHwStatus: anfrage?.hw_status ?? null,
      angebotHwEingereichtAt: anfrage?.hw_eingereicht_at ?? null,
      angebotHwKonditionenArt: anfrage?.hw_konditionen?.art ?? null,
      aufgabe_notiz: anfrage?.aufgabe_notiz ?? null,
      hw_crm_notiz: anfrage?.hw_crm_notiz ?? null,
      projektvertrag_bestaetigt_am: vertragCtx?.projektvertrag_bestaetigt_am ?? null,
      vertrag: vertragCtx,
      nachreichungOpenPositionIds,
      hw_angebot_pdf_url: anfrage?.hw_angebot_pdf_url ?? null,
      hw_angebot_pdf_signed_url: anfrage?.hw_angebot_pdf_signed_url ?? null,
      hw_angebot_anhang_urls: anfrage?.hw_angebot_anhang_urls,
      hw_angebot_anhang_signed_urls: anfrage?.hw_angebot_anhang_signed_urls,
      hw_rechnung_pdf_url: anfrage?.hw_rechnung_pdf_url ?? null,
      hw_rechnung_pdf_signed_url: anfrage?.hw_rechnung_pdf_signed_url ?? null,
      hw_rechnung_eingereicht_at: anfrage?.hw_rechnung_eingereicht_at ?? null,
    };
  });

  const nachreichungAnfrageIds = new Set<string>();
  for (const a of alleAuftraege) {
    if (!a.nachreichungOpenPositionIds?.length) continue;
    const angebotId = auftragAngebotIdByAuftragId.get(a.id);
    if (!angebotId) continue;
    for (const af of anfragenByAngebotId.get(angebotId) ?? []) {
      nachreichungAnfrageIds.add(af.id);
    }
  }

  const anfragenAngebot = anfragenFinal.filter(
    (a) => isPartnerAngebotOffenListItem(a) || nachreichungAnfrageIds.has(a.id)
  );
  const angebote: typeof anfragenFinal = [];
  const angeboteAlleAkzeptiert: typeof anfragenFinal = [];
  const auftragAnfragenListe = alleAuftraege.filter((a) => {
    if (!isPartnerAuftragAnfrageAktionErforderlich(a)) return false;
    const angebotId = auftragAngebotIdByAuftragId.get(a.id);
    if (!angebotId) return true;
    return !anfragenAngebot.some((x) => x.angebot_id === angebotId);
  });
  const auftraegeListe = alleAuftraege.filter(
    (a) => !isPartnerAuftragAnfrageAktionErforderlich(a)
  );

  const gewerkSlugs = Array.isArray(handwerker.gewerke)
    ? (handwerker.gewerke as string[]).map((s) => s.trim()).filter(Boolean)
    : [];
  const slugToName = new Map(
    complianceBundle.alleGewerke.map((g) => [g.slug, g.name?.trim() || g.slug])
  );
  const gewerkNamen = gewerkSlugs.map((slug) => slugToName.get(slug) ?? slug);

  const offeneLeistungsunterlagen = buildOffeneLeistungsUnterlagen(
    Array.from(complianceBundle.vertragByAuftragId.entries()).map(
      ([auftragId, ctx]) => {
        const auftrag =
          alleAuftraege.find((a) => a.id === auftragId) ??
          auftragAnfragenListe.find((a) => a.id === auftragId);
        return {
          auftrag_id: auftragId,
          auftrag_titel: auftrag?.listen_titel ?? auftrag?.titel ?? "Auftrag",
          items: buildBauauftragComplianceItems(
            ctx.compliance_stamm,
            ctx.compliance_projekt,
            ctx.compliance_bauauftrag
          ),
        };
      }
    )
  );

  const allgemein = applyRahmenvertragPortalAkzeptanz(
    complianceBundle.stamm.compliance_allgemein,
    rahmenvertrag
  );
  const meister = applyRahmenvertragPortalAkzeptanz(
    complianceBundle.stamm.compliance_meister,
    rahmenvertrag
  );

  const profilKontext: PartnerProfilKontext = {
    allgemein,
    meister,
    stamm: [...allgemein, ...meister],
    profil: {
      leistet_bauleistung: partnerLeistetBauleistung(
        complianceBundle.handwerkerGewerke,
        complianceBundle.alleGewerke
      ),
      hat_meister_gewerke: partnerHatMeisterGewerke(
        complianceBundle.handwerkerGewerke,
        complianceBundle.alleGewerke
      ),
    },
    rahmenvertrag,
    offeneLeistungsunterlagen,
  };

  let bautagebuchAnfrageRows: Array<Record<string, unknown>> | null = null;
  {
    const full = await supabaseAdmin
      .from("partner_bautagebuch_anfragen")
      .select("id, auftrag_id, notiz, created_at, position_ids")
      .eq("handwerker_id", id)
      .is("erledigt_at", null)
      .order("created_at", { ascending: false });
    if (full.error && /position_ids/i.test(full.error.message)) {
      const legacy = await supabaseAdmin
        .from("partner_bautagebuch_anfragen")
        .select("id, auftrag_id, notiz, created_at")
        .eq("handwerker_id", id)
        .is("erledigt_at", null)
        .order("created_at", { ascending: false });
      bautagebuchAnfrageRows =
        (legacy.data as Array<Record<string, unknown>> | null) ?? [];
    } else {
      bautagebuchAnfrageRows =
        (full.data as Array<Record<string, unknown>> | null) ?? [];
    }
  }

  const bautagebuchAnfragen: PartnerBautagebuchAnfrageItem[] = (
    bautagebuchAnfrageRows ?? []
  ).map((row) => {
    const rawIds = row.position_ids;
    const position_ids = Array.isArray(rawIds)
      ? rawIds.map((x) => String(x).trim()).filter(Boolean)
      : [];
    return {
      id: String(row.id),
      auftrag_id: String(row.auftrag_id),
      notiz: (row.notiz as string | null) ?? null,
      created_at: String(row.created_at),
      position_ids,
    };
  });

  const bautagebuchAnfrageAuftragIds = new Set(
    bautagebuchAnfragen.map((r) => r.auftrag_id)
  );
  const bautagebuchNotizByAuftragId = new Map(
    bautagebuchAnfragen.map((r) => [r.auftrag_id, r.notiz] as const)
  );
  const bautagebuchAnfrageByAuftragId = new Map(
    bautagebuchAnfragen.map((r) => [r.auftrag_id, r] as const)
  );

  const markBautagebuchAnfrage = (item: PartnerAuftragItem): PartnerAuftragItem => {
    const a = bautagebuchAnfrageByAuftragId.get(item.id);
    return {
      ...item,
      bautagebuchAnfrageOffen: bautagebuchAnfrageAuftragIds.has(item.id),
      bautagebuchAnfrageId: a?.id ?? null,
      bautagebuchAnfrageNotiz: bautagebuchNotizByAuftragId.get(item.id) ?? null,
      bautagebuchAnfragePositionIds: a?.position_ids ?? [],
    };
  };

  // Fachdoku-Slots: bestehende laden (Materialisierung lazy im UI/Actions)
  const fachdokuByAuftrag = new Map<
    string,
    NonNullable<PartnerAuftragItem["fachdokuSlots"]>
  >();
  const auftragIdsForFachdoku = alleAuftraege.map((a) => a.id);
  if (auftragIdsForFachdoku.length) {
    try {
      const { data: fachRows, error: fachErr } = await supabaseAdmin
        .from("auftrag_fachdoku_slots")
        .select(
          "id, auftrag_id, slot_code, label, status, datei_url, datei_name, uploaded_by_role, erledigt_am"
        )
        .in("auftrag_id", auftragIdsForFachdoku);
      if (!fachErr) {
        const fachMapped = await Promise.all(
          (fachRows ?? []).map(async (row) => {
            const r = row as {
              id: string;
              auftrag_id: string;
              slot_code: string;
              label: string;
              status: string;
              datei_url: string | null;
              datei_name: string | null;
              uploaded_by_role: string | null;
              erledigt_am: string | null;
            };
            const signed = r.datei_url
              ? await resolveUrlListSafe(r.datei_url)
              : null;
            return {
              aid: String(r.auftrag_id),
              slot: {
                id: String(r.id),
                slot_code: r.slot_code,
                label: r.label,
                status: r.status,
                datei_url: r.datei_url,
                datei_name: r.datei_name,
                signed_url: signed,
                erledigt_am: r.erledigt_am,
                uploaded_by_role: r.uploaded_by_role,
              },
            };
          })
        );
        for (const { aid, slot } of fachMapped) {
          const list = fachdokuByAuftrag.get(aid) ?? [];
          list.push(slot);
          fachdokuByAuftrag.set(aid, list);
        }
      }
    } catch {
      /* Tabelle ggf. noch nicht migriert */
    }
  }

  const attachFachdoku = (item: PartnerAuftragItem): PartnerAuftragItem => ({
    ...item,
    fachdokuSlots: fachdokuByAuftrag.get(item.id) ?? [],
  });

  const alleAuftraegeMitMeta = alleAuftraege
    .map(markBautagebuchAnfrage)
    .map(attachFachdoku);

  const vorgaenge = buildPartnerVorgaenge({
    alleAuftraege: alleAuftraegeMitMeta,
    anfragen: anfragenAngebot,
  });

  const auftragAnfragen = auftragAnfragenListe
    .map(markBautagebuchAnfrage)
    .map(attachFachdoku);
  const auftraege = auftraegeListe.map(markBautagebuchAnfrage).map(attachFachdoku);

  const offen = buildPartnerOffenListe({
    anfragen: anfragenAngebot,
    auftragAnfragen,
  });

  const auftragTitelById = new Map<string, string>();
  for (const a of [...auftragAnfragen, ...auftraege]) {
    auftragTitelById.set(a.id, a.listen_titel);
  }

  const termine = buildPartnerTermine({
    auftragAnfragen,
    auftraege,
  });

  const aufgaben = buildPartnerAufgaben({
    vorgaenge,
    bautagebuchAnfragen,
    offeneLeistungsunterlagen: offeneLeistungsunterlagen,
  });

  if (bautagebuchAnfragen.length > 0) {
    void ensurePartnerBautagebuchNotifications({
      handwerkerId: id,
      anfragen: bautagebuchAnfragen,
      titelByAuftragId: auftragTitelById,
    });
  }

  if (offen.length > 0 || vorgaenge.some((v) => v.state === "neu")) {
    void ensurePartnerOffenNotifications({
      handwerkerId: id,
      offen,
      vorgaenge,
    });
  }

  return {
    profil: profilKontext,
    termine,
    aufgaben,
    handwerker: await (async () => {
      const ansprechpartner = resolveHandwerkerAnsprechpartner({
        vorname: handwerker.vorname as string | null | undefined,
        nachname: handwerker.nachname as string | null | undefined,
        name: handwerker.name as string | null | undefined,
      });
      const logoPath =
        ((handwerker as { logo_url?: string | null }).logo_url as string | null) ??
        null;
      const logoSigned = logoPath
        ? await signedCache.resolve(logoPath)
        : null;
      return {
      name: ansprechpartner.vollname || "Partner",
      vorname: ansprechpartner.vorname,
      nachname: ansprechpartner.nachname,
      firma: handwerker.firma as string | null,
      email: handwerker.email as string | null,
      telefon: (handwerker.telefon as string | null) ?? null,
      webseite: (handwerker.webseite as string | null) ?? null,
      adresse: (handwerker.adresse as string | null) ?? null,
      strasse: ((handwerker as { strasse?: string | null }).strasse as string | null) ?? null,
      hausnummer:
        ((handwerker as { hausnummer?: string | null }).hausnummer as string | null) ??
        null,
      plz: ((handwerker as { plz?: string | null }).plz as string | null) ?? null,
      ort: ((handwerker as { ort?: string | null }).ort as string | null) ?? null,
      steuernummer: (handwerker.steuernummer as string | null) ?? null,
      ustid: (handwerker.ustid as string | null) ?? null,
      handelsregister:
        ((handwerker as { handelsregister?: string | null }).handelsregister as
          | string
          | null) ?? null,
      iban: (handwerker.iban as string | null) ?? null,
      bic: ((handwerker as { bic?: string | null }).bic as string | null) ?? null,
      bank: ((handwerker as { bank?: string | null }).bank as string | null) ?? null,
      logo_url: logoPath,
      logo_signed_url: logoSigned,
      kleinunternehmer: Boolean(
        (handwerker as { kleinunternehmer?: boolean | null }).kleinunternehmer
      ),
      gewerke: gewerkSlugs,
      gewerkNamen,
      bewertung: {
        bewertung_gesamt: numOrNull(handwerker.bewertung_gesamt),
        bewertung_qualitaet: numOrNull(handwerker.bewertung_qualitaet),
        bewertung_termintreue: numOrNull(handwerker.bewertung_termintreue),
        bewertung_sauberkeit: numOrNull(handwerker.bewertung_sauberkeit),
        bewertung_kommunikation: numOrNull(handwerker.bewertung_kommunikation),
        bewertung_preis_leistung: numOrNull(handwerker.bewertung_preis_leistung),
        bewertung_anzahl: Math.max(0, Number(handwerker.bewertung_anzahl ?? 0) || 0),
      },
    };
    })(),
    anfragen: anfragenAngebot,
    angebote,
    angeboteAlleAkzeptiert,
    offen,
    vorgaenge,
    auftragAnfragen,
    auftraege,
  };
}
