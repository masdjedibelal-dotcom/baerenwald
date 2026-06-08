import {
  aggregateAuftragHandwerkerStatus,
  resolveAngebotHandwerkerPhase,
  isAuftragAnfrageListItem,
  isAuftragAuftraegeListItem,
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
import type { PortalAnfrageLeadSource } from "@/lib/portal/portal-anfrage-display";
import { syncAngebotHandwerkerAfterAuftragAccept } from "@/lib/partner/sync-angebot-handwerker";
import {
  resolvePartnerFileUrl,
  resolvePartnerFileUrls,
} from "@/lib/partner/partner-storage";
import type { PartnerAuftragBewertung } from "@/lib/partner/handwerker-bewertung-display";
import type { PartnerHandwerkerBewertungProfil } from "@/lib/partner/handwerker-bewertung-display";
import type { PartnerComplianceItem } from "@/lib/partner/partner-compliance";
import {
  loadHandwerkerComplianceBundle,
  vertragKontextForAngebot,
  type PartnerVertragKontext,
} from "@/lib/partner/load-partner-compliance-data";
import type { PartnerProjektvertrag } from "@/lib/partner/partner-compliance";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export type PartnerAnfrageItem = {
  id: string;
  angebot_id: string;
  status: string;
  gewerk_name: string;
  angebot_titel: string;
  gesendet_at?: string | null;
  antwort_at?: string | null;
  antwort_notiz?: string;
  ablehnung_grund?: string;
  aufgabe_notiz?: string;
  plz: string;
  ort: string;
  zeitraum: string;
  positionen: Array<{
    beschreibung: string;
    menge: number;
    einheit?: string;
  }>;
  hw_status?: string;
  hw_eingereicht_at?: string;
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
  /** Projekt-/Lead-Kontext ohne Kundendaten. */
  lead?: PortalAnfrageLeadSource | null;
  crm_positionen_raw?: unknown;
  crm_gesamt_fix?: number | null;
  crm_gesamt_min?: number | null;
  crm_gesamt_max?: number | null;
  auftrag_id?: string | null;
  projektvertrag_bestaetigt_am?: string | null;
  projektvertrag_bereit?: boolean;
  projektvertrag?: PartnerProjektvertrag | null;
  compliance_stamm?: PartnerComplianceItem[];
  compliance_projekt?: PartnerComplianceItem[];
  dokumente?: PartnerVertragKontext["dokumente_zeilen"];
};

export type PartnerAuftragPosition = {
  id: string;
  gewerk_name: string;
  leistung_name: string;
  beschreibung: string | null;
  menge: number | null;
  einheit: string | null;
};

export type PartnerBautagebuchItem = {
  id: string;
  titel: string;
  beschreibung: string | null;
  datum: string;
  foto_urls: string[];
  foto_signed_urls: string[];
  fuer_kunde_freigegeben: boolean;
  own: boolean;
  handwerker_id: string | null;
};

export type PartnerAuftragItem = {
  id: string;
  titel: string;
  status: string;
  fortschritt: number | null;
  start_datum: string | null;
  end_datum: string | null;
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
  /** CRM-Bewertung nach Abschluss (read-only). */
  bewertung?: PartnerAuftragBewertung | null;
  projektvertrag_bestaetigt_am?: string | null;
  vertrag?: PartnerVertragKontext | null;
};

export type PartnerHandwerkerProfil = {
  name: string;
  firma: string | null;
  email: string | null;
  bewertung: PartnerHandwerkerBewertungProfil;
};

function one<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null;
  return Array.isArray(x) ? (x[0] as T) ?? null : x;
}

function parseHwAnhangUrls(raw: unknown, fallbackPath: string | null): string[] {
  if (Array.isArray(raw)) {
    const paths = raw.map((x) => String(x).trim()).filter(Boolean);
    if (paths.length) return paths;
  }
  const fb = fallbackPath?.trim();
  return fb ? [fb] : [];
}

async function mapHwAngebotAnhaenge(raw: Record<string, unknown>) {
  const pdfPath = (raw.hw_angebot_pdf_url as string | null) ?? null;
  const anhangPaths = parseHwAnhangUrls(raw.hw_angebot_anhang_urls, pdfPath);
  const signed = (
    await Promise.all(anhangPaths.map((p) => resolvePartnerFileUrl(p)))
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
    .select("id, titel, strasse, hausnummer, plz, ort")
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
  objektById: Map<string, PartnerKundenObjektRow>
): Promise<PartnerAnfrageItem[]> {
  return Promise.all(
    rows.map((row) =>
      mapAngebotHandwerkerRow(
        row,
        objektById,
        mapHwAngebotAnhaenge,
        resolvePartnerFileUrl
      )
    )
  );
}

export async function getPartnerDataForHandwerker(handwerkerId: string) {
  if (!isSupabaseConfigured()) return null;

  const id = handwerkerId.trim();
  if (!id) return null;

  const { data: handwerker } = await supabaseAdmin
    .from("handwerker")
    .select(
      `
      id,
      name,
      firma,
      email,
      telefon,
      bewertung_gesamt,
      bewertung_qualitaet,
      bewertung_termintreue,
      bewertung_sauberkeit,
      bewertung_kommunikation,
      bewertung_preis_leistung,
      bewertung_anzahl
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (!handwerker) return null;

  const { data: rows } = await supabaseAdmin
    .from("angebot_handwerker")
    .select(ANGEBOT_HANDWERKER_BASE_SELECT)
    .eq("handwerker_id", id)
    .order("gesendet_at", { ascending: false });

  const rawRows = (rows ?? []) as Array<Record<string, unknown>>;
  const objektById = await loadPartnerObjektById(
    collectObjektIdsFromAngebotHandwerkerRows(rawRows)
  );
  const anfragen: PartnerAnfrageItem[] = await mapAngebotHandwerkerRows(
    rawRows,
    objektById
  );

  const { data: hwAuftraege } = await supabaseAdmin
    .from("auftrag_handwerker")
    .select("auftrag_id, status")
    .eq("handwerker_id", id);

  const { data: posAuftraege } = await supabaseAdmin
    .from("auftrag_positionen")
    .select("auftrag_id, handwerker_status")
    .eq("handwerker_id", id);

  const hwStatusByAuftrag = new Map<string, string[]>();
  const posStatusByAuftrag = new Map<string, string[]>();

  for (const r of hwAuftraege ?? []) {
    const aid = String((r as { auftrag_id: string }).auftrag_id);
    const list = hwStatusByAuftrag.get(aid) ?? [];
    list.push(String((r as { status?: string }).status ?? "ausstehend"));
    hwStatusByAuftrag.set(aid, list);
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
        kunden(plz, ort),
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
          handwerker_status
        )
      `
      )
      .in("id", auftragIds)
      .order("created_at", { ascending: false });

    const { data: btRows } = await supabaseAdmin
      .from("auftrag_bautagebuch_eintraege")
      .select(
        "id, auftrag_id, titel, beschreibung, datum, foto_urls, fuer_kunde_freigegeben, handwerker_id"
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

    for (const bt of btRows ?? []) {
      const r = bt as Record<string, unknown>;
      const aid = String(r.auftrag_id);
      const paths = Array.isArray(r.foto_urls)
        ? (r.foto_urls as string[]).map((s) => String(s).trim()).filter(Boolean)
        : [];
      const signed = await resolvePartnerFileUrls(paths);
      const item: PartnerBautagebuchItem = {
        id: String(r.id),
        titel: String(r.titel ?? ""),
        beschreibung: (r.beschreibung as string | null) ?? null,
        datum: String(r.datum).slice(0, 10),
        foto_urls: paths,
        foto_signed_urls: signed,
        fuer_kunde_freigegeben: Boolean(r.fuer_kunde_freigegeben),
        own: String(r.handwerker_id ?? "") === id,
        handwerker_id: (r.handwerker_id as string | null) ?? null,
      };
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

    alleAuftraege = (aufRows ?? []).map((row) => {
      const raw = row as Record<string, unknown>;
      const kunde = one(raw.kunden) as { plz: string | null; ort: string | null } | null;
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
      const ownPos = allPos.filter((p) => String(p.handwerker_id ?? "") === id);
      const positionen = ownPos.map((p) => ({
        id: String(p.id),
        gewerk_name: String(p.gewerk_name ?? "Gewerk"),
        leistung_name: String(p.leistung_name ?? ""),
        beschreibung: (p.beschreibung as string | null) ?? null,
        menge: p.menge != null ? Number(p.menge) : null,
        einheit: (p.einheit as string | null) ?? null,
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

      return {
        id: aid,
        titel: String(raw.titel ?? "Auftrag").trim() || "Auftrag",
        status: auftragStatus,
        fortschritt:
          raw.fortschritt != null && Number.isFinite(Number(raw.fortschritt))
            ? Number(raw.fortschritt)
            : null,
        start_datum: (raw.start_datum as string | null) ?? null,
        end_datum: (raw.end_datum as string | null) ?? null,
        angebot_id: linkedAngebotId || null,
        plz: lead?.objekt?.plz?.trim() || kunde?.plz?.trim() || "—",
        ort: lead?.objekt?.ort?.trim() || kunde?.ort?.trim() || "—",
        lead,
        positionen,
        bautagebuch: btByAuftrag.get(aid) ?? [],
        portalPhase,
        hwStatus,
        bewertung: bewertungByAuftragId.get(aid) ?? null,
      };
    });
  }

  let anfragenFinal = anfragen;
  let repaired = false;
  for (const a of alleAuftraege) {
    if (a.hwStatus.toLowerCase() !== "akzeptiert") continue;
    const angebotId = auftragAngebotIdByAuftragId.get(a.id);
    if (!angebotId) continue;
    const hasAngebotPhase = anfragenFinal.some(
      (x) =>
        x.angebot_id === angebotId &&
        resolveAngebotHandwerkerPhase(x) === "angebot"
    );
    if (hasAngebotPhase) continue;
    await syncAngebotHandwerkerAfterAuftragAccept({
      handwerkerId: id,
      angebotId,
      auftragId: a.id,
    });
    repaired = true;
  }

  if (repaired) {
    const { data: rowsReload } = await supabaseAdmin
      .from("angebot_handwerker")
      .select(ANGEBOT_HANDWERKER_BASE_SELECT)
      .eq("handwerker_id", id)
      .order("gesendet_at", { ascending: false });
    if (rowsReload?.length) {
      const reloadRaw = rowsReload as Array<Record<string, unknown>>;
      const reloadObjektById = await loadPartnerObjektById(
        collectObjektIdsFromAngebotHandwerkerRows(reloadRaw)
      );
      anfragenFinal = await mapAngebotHandwerkerRows(reloadRaw, reloadObjektById);
    }
  }

  const complianceBundle = await loadHandwerkerComplianceBundle(id);

  anfragenFinal = anfragenFinal.map((a) => {
    const vertragCtx = vertragKontextForAngebot(a.angebot_id, complianceBundle);
    return {
      ...a,
      auftrag_id: complianceBundle.auftragIdByAngebotId.get(a.angebot_id) ?? null,
      projektvertrag_bestaetigt_am: vertragCtx?.projektvertrag_bestaetigt_am ?? null,
      projektvertrag_bereit: vertragCtx?.projektvertrag_bereit ?? false,
      projektvertrag: vertragCtx?.projektvertrag ?? null,
      compliance_stamm: vertragCtx?.compliance_stamm ?? [],
      compliance_projekt: vertragCtx?.compliance_projekt ?? [],
      dokumente: vertragCtx?.dokumente_zeilen ?? [],
    };
  });

  const angeboteOffenByAngebotId = new Map<string, string>();
  for (const a of anfragenFinal) {
    if (resolveAngebotHandwerkerPhase(a) === "angebot") {
      angeboteOffenByAngebotId.set(a.angebot_id, a.id);
    }
  }

  alleAuftraege = alleAuftraege.map((a) => {
    const angebotId = auftragAngebotIdByAuftragId.get(a.id);
    const vertragCtx = complianceBundle.vertragByAuftragId.get(a.id) ?? null;
    return {
      ...a,
      angebotHandwerkerId: angebotId
        ? (angeboteOffenByAngebotId.get(angebotId) ?? null)
        : null,
      projektvertrag_bestaetigt_am: vertragCtx?.projektvertrag_bestaetigt_am ?? null,
      vertrag: vertragCtx,
    };
  });

  const anfragenAngebot = anfragenFinal.filter(
    (a) => resolveAngebotHandwerkerPhase(a) === "anfrage"
  );
  const angebote = anfragenFinal.filter(
    (a) => resolveAngebotHandwerkerPhase(a) === "angebot"
  );
  /** Akzeptierte HW-Angebote (inkl. übernommen) — Deep-Link & Detail nach CRM-Bestätigung. */
  const angeboteAlleAkzeptiert = anfragenFinal.filter(
    (a) => a.status.toLowerCase() === "akzeptiert"
  );
  const auftragAnfragen = alleAuftraege.filter(isAuftragAnfrageListItem);
  const auftraege = alleAuftraege.filter(isAuftragAuftraegeListItem);

  return {
    handwerker: {
      name: String(handwerker.name ?? "Partner"),
      firma: handwerker.firma as string | null,
      email: handwerker.email as string | null,
      bewertung: {
        bewertung_gesamt: numOrNull(handwerker.bewertung_gesamt),
        bewertung_qualitaet: numOrNull(handwerker.bewertung_qualitaet),
        bewertung_termintreue: numOrNull(handwerker.bewertung_termintreue),
        bewertung_sauberkeit: numOrNull(handwerker.bewertung_sauberkeit),
        bewertung_kommunikation: numOrNull(handwerker.bewertung_kommunikation),
        bewertung_preis_leistung: numOrNull(handwerker.bewertung_preis_leistung),
        bewertung_anzahl: Math.max(0, Number(handwerker.bewertung_anzahl ?? 0) || 0),
      },
    },
    anfragen: anfragenAngebot,
    angebote,
    angeboteAlleAkzeptiert,
    auftragAnfragen,
    auftraege,
  };
}
