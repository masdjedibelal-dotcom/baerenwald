import { logDbError } from '@/lib/errors/log-db-error'
import {
  buildPartnerStammCompliance,
  buildProjektCompliance,
  enrichComplianceWithSignedUrls,
  hasGueltigerProjektvertrag,
  mapProjektvertragRow,
  type PartnerComplianceItem,
  type PartnerComplianceTypRow,
  type PartnerDokumentRow,
  type PartnerProjektvertrag,
} from "@/lib/partner/partner-compliance";
import {
  projektHatBauleistung,
  resolveProjektGewerkSlugsFromPositionen,
  type PartnerGewerkRow,
} from "@/lib/partner/compliance-partner-profile";
import { buildBauprojektNachunternehmerCompliance } from "@/lib/partner/nachunternehmervertrag-compliance";
import { fetchCrmProjektvertrag } from "@/lib/partner/partner-crm-api";
import type { PartnerRahmenvertrag } from "@/lib/partner/compliance-summary";
import { resolvePartnerFileUrl } from "@/lib/partner/partner-storage";
import { supabaseAdmin } from "@/lib/supabase";

export type PartnerVertragKontext = {
  auftrag_id: string | null;
  projektvertrag_bestaetigt_am: string | null;
  projektvertrag: PartnerProjektvertrag | null;
  projektvertrag_bereit: boolean;
  /** Gewerke dieses Auftrags mit ist_bauleistung=true in gewerke-Tabelle. */
  ist_bauprojekt: boolean;
  projekt_gewerk_slugs: string[];
  compliance_allgemein: PartnerComplianceItem[];
  compliance_meister: PartnerComplianceItem[];
  compliance_leistung: PartnerComplianceItem[];
  /** Allgemein + Meister (Kompatibilität) */
  compliance_stamm: PartnerComplianceItem[];
  /** Alias für compliance_leistung */
  compliance_projekt: PartnerComplianceItem[];
  /** §6 / Anlage 1 Nachunternehmervertrag — nur bei Bauprojekten */
  compliance_bauauftrag: PartnerComplianceItem[];
  dokumente_zeilen: Array<{
    id: string;
    datum?: string | null;
    name: string;
    href?: string;
  }>;
};

let typenCache: PartnerComplianceTypRow[] | null = null;
let gewerkeCache: PartnerGewerkRow[] | null = null;

export async function loadComplianceTypen(): Promise<PartnerComplianceTypRow[]> {
  if (typenCache) return typenCache;
  const {data, error: __dbErr389_1} = await supabaseAdmin
    .from("compliance_dokument_typen")
    .select(
      "slug, bezeichnung, beschreibung, pflicht_fuer_fachbetriebe, pflicht_bauprojekt, mehrfach_erlaubt, kategorie, sort_order, scope, compliance_ebene, nur_bei_bauleistung, gewerk_slugs, erneuerung_monate, aktiv"
    )
    .eq("aktiv", true)
    .order("sort_order", { ascending: true });
  if (__dbErr389_1) logDbError('lib/partner/load-partner-compliance-data:compliance_dokument_typen', __dbErr389_1)
  typenCache = (data ?? []) as PartnerComplianceTypRow[];
  return typenCache;
}

export async function loadPartnerGewerke(): Promise<PartnerGewerkRow[]> {
  if (gewerkeCache) return gewerkeCache;
  const {data, error: __dbErr390_2} = await supabaseAdmin
    .from("gewerke")
    .select("slug, name, ausfuehrung, ist_bauleistung")
    .order("sort_order", { ascending: true });
  if (__dbErr390_2) logDbError('lib/partner/load-partner-compliance-data:gewerke', __dbErr390_2)
  gewerkeCache = (data ?? []) as PartnerGewerkRow[];
  return gewerkeCache;
}

async function loadHandwerkerGewerke(handwerkerId: string): Promise<string[] | null> {
  const {data, error: __dbErr391_3} = await supabaseAdmin
    .from("handwerker")
    .select("gewerke")
    .eq("id", handwerkerId)
    .maybeSingle();
  if (__dbErr391_3) logDbError('lib/partner/load-partner-compliance-data:handwerker', __dbErr391_3)
  return ((data as { gewerke?: string[] | null } | null)?.gewerke ?? null) as string[] | null;
}

async function loadPartnerDokumente(
  handwerkerId: string,
  auftragIds: string[]
): Promise<PartnerDokumentRow[]> {
  let query = supabaseAdmin
    .from("partner_dokumente")
    .select(
      "id, typ, bezeichnung, gueltig_bis, datei_url, status, ablehnung_grund, hochgeladen_am, freigegeben_am, auftrag_id"
    )
    .eq("handwerker_id", handwerkerId)
    .order("hochgeladen_am", { ascending: false });

  if (auftragIds.length) {
    query = query.or(`auftrag_id.is.null,auftrag_id.in.(${auftragIds.join(",")})`);
  } else {
    query = query.is("auftrag_id", null);
  }

  const { data } = await query;
  return ((data ?? []) as PartnerDokumentRow[]).filter(
    (d) => String(d.status ?? "").toLowerCase() !== "geloescht"
  );
}

async function loadProjektGewerkSlugs(
  handwerkerId: string,
  auftragId: string,
  alleGewerke: PartnerGewerkRow[]
): Promise<string[]> {
  const {data, error: __dbErr392_4} = await supabaseAdmin
    .from("auftrag_positionen")
    .select("gewerk_slug, gewerk_name")
    .eq("auftrag_id", auftragId)
    .eq("handwerker_id", handwerkerId);
  if (__dbErr392_4) logDbError('lib/partner/load-partner-compliance-data:auftrag_positionen', __dbErr392_4)
  return resolveProjektGewerkSlugsFromPositionen(
    (data ?? []) as Array<{ gewerk_slug?: string | null; gewerk_name?: string | null }>,
    alleGewerke
  );
}

export async function loadRahmenvertrag(
  handwerkerId: string
): Promise<PartnerRahmenvertrag | null> {
  const {data, error: __dbErr393_5} = await supabaseAdmin
    .from("handwerker_vertraege")
    .select("id, vertrags_nr, status, pdf_url, signiert_am, portal_akzeptiert_am")
    .eq("handwerker_id", handwerkerId)
    .eq("typ", "rahmen")
    .is("auftrag_id", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (__dbErr393_5) logDbError('lib/partner/load-partner-compliance-data:handwerker_vertraege', __dbErr393_5)
  if (!data) return null;
  const pdf_url = (data as { pdf_url?: string | null }).pdf_url ?? null;
  const pdf_signed_url = pdf_url ? await resolvePartnerFileUrl(pdf_url) : null;
  return {
    id: String((data as { id: string }).id),
    vertrags_nr: ((data as { vertrags_nr?: string | null }).vertrags_nr ?? null) as
      | string
      | null,
    status: String((data as { status?: string }).status ?? "entwurf"),
    pdf_url,
    pdf_signed_url,
    signiert_am: ((data as { signiert_am?: string | null }).signiert_am ?? null) as
      | string
      | null,
    portal_akzeptiert_am: ((data as { portal_akzeptiert_am?: string | null })
      .portal_akzeptiert_am ?? null) as string | null,
  };
}

async function loadProjektvertragDb(
  handwerkerId: string,
  auftragId: string
): Promise<PartnerProjektvertrag | null> {
  const {data, error: __dbErr394_6} = await supabaseAdmin
    .from("handwerker_vertraege")
    .select(
      "id, vertrags_nr, status, pdf_url, auftrag_titel, gewerk_name, bauvorhaben, leistungsumfang, verguetung_text, signiert_am"
    )
    .eq("handwerker_id", handwerkerId)
    .eq("auftrag_id", auftragId)
    .eq("typ", "projekt")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (__dbErr394_6) logDbError('lib/partner/load-partner-compliance-data:handwerker_vertraege', __dbErr394_6)
  return mapProjektvertragRow(data as Record<string, unknown> | null);
}

async function loadProjektvertragBestaetigtAm(
  handwerkerId: string,
  auftragId: string
): Promise<string | null> {
  const {data, error: __dbErr395_7} = await supabaseAdmin
    .from("auftrag_handwerker")
    .select("projektvertrag_bestaetigt_am")
    .eq("handwerker_id", handwerkerId)
    .eq("auftrag_id", auftragId)
    .maybeSingle();
  if (__dbErr395_7) logDbError('lib/partner/load-partner-compliance-data:auftrag_handwerker', __dbErr395_7)
  const raw = (data as { projektvertrag_bestaetigt_am?: string | null } | null)
    ?.projektvertrag_bestaetigt_am;
  return raw ?? null;
}

async function mergeVertragFromCrm(
  auftragId: string,
  existing: PartnerProjektvertrag | null
): Promise<PartnerProjektvertrag | null> {
  const crm = await fetchCrmProjektvertrag(auftragId);
  if (!crm && !existing) return null;

  const pdf_url = crm?.pdf_url ?? existing?.pdf_url ?? null;
  const pdf_signed_url = pdf_url ? await resolvePartnerFileUrl(pdf_url) : null;

  return {
    id: existing?.id ?? `crm-${auftragId}`,
    vertrags_nr: crm?.vertrags_nr ?? existing?.vertrags_nr ?? null,
    status: crm?.status ?? existing?.status ?? "pdf_erzeugt",
    pdf_url,
    pdf_signed_url,
    auftrag_titel: crm?.auftrag_titel ?? existing?.auftrag_titel ?? null,
    gewerk_name: crm?.gewerk_name ?? existing?.gewerk_name ?? null,
    bauvorhaben: crm?.bauvorhaben ?? existing?.bauvorhaben ?? null,
    leistungsumfang: crm?.leistungsumfang ?? existing?.leistungsumfang ?? null,
    verguetung_text: crm?.verguetung_text ?? existing?.verguetung_text ?? null,
    signiert_am: existing?.signiert_am ?? null,
  };
}

function dokumenteZeilenFromKontext(
  vertrag: PartnerProjektvertrag | null,
  dokumente: PartnerDokumentRow[],
  auftragId: string | null
): PartnerVertragKontext["dokumente_zeilen"] {
  const rows: PartnerVertragKontext["dokumente_zeilen"] = [];

  if (vertrag?.pdf_signed_url || vertrag?.pdf_url) {
    rows.push({
      id: `vertrag-${vertrag.id}`,
      datum: vertrag.signiert_am,
      name: vertrag.vertrags_nr
        ? `Projektvertrag ${vertrag.vertrags_nr}`
        : "Projektvertrag",
      href: vertrag.pdf_signed_url ?? vertrag.pdf_url ?? undefined,
    });
  }

  for (const d of dokumente) {
    if (auftragId) {
      if (d.auftrag_id !== auftragId) continue;
    } else if (d.auftrag_id) {
      continue;
    }
    rows.push({
      id: d.id,
      datum: d.hochgeladen_am,
      name: d.bezeichnung?.trim() || d.typ,
    });
  }

  return rows;
}

function stammKontext(
  stamm: { allgemein: PartnerComplianceItem[]; meister: PartnerComplianceItem[] },
  leistung: PartnerComplianceItem[],
  compliance_bauauftrag: PartnerComplianceItem[]
): Pick<
  PartnerVertragKontext,
  | "compliance_allgemein"
  | "compliance_meister"
  | "compliance_leistung"
  | "compliance_stamm"
  | "compliance_projekt"
  | "compliance_bauauftrag"
> {
  return {
    compliance_allgemein: stamm.allgemein,
    compliance_meister: stamm.meister,
    compliance_leistung: leistung,
    compliance_stamm: [...stamm.allgemein, ...stamm.meister],
    compliance_projekt: leistung,
    compliance_bauauftrag,
  };
}

export async function buildVertragKontextForAuftrag(opts: {
  handwerkerId: string;
  auftragId: string;
  gewerkName?: string;
  alleDokumente: PartnerDokumentRow[];
  typen: PartnerComplianceTypRow[];
  handwerkerGewerke: string[] | null | undefined;
  alleGewerke: PartnerGewerkRow[];
}): Promise<PartnerVertragKontext> {
  const dbVertrag = await loadProjektvertragDb(opts.handwerkerId, opts.auftragId);
  const projektvertrag = await mergeVertragFromCrm(opts.auftragId, dbVertrag);
  const projektvertrag_bestaetigt_am = await loadProjektvertragBestaetigtAm(
    opts.handwerkerId,
    opts.auftragId
  );

  const projektGewerkSlugs = await loadProjektGewerkSlugs(
    opts.handwerkerId,
    opts.auftragId,
    opts.alleGewerke
  );

  const {data: auftragRow, error: __dbErr396_8} = await supabaseAdmin
    .from("auftraege")
    .select("ist_bauprojekt")
    .eq("id", opts.auftragId)
    .maybeSingle();
  if (__dbErr396_8) logDbError('lib/partner/load-partner-compliance-data:auftraege', __dbErr396_8)
  const explicitBauprojekt = (auftragRow as { ist_bauprojekt?: boolean | null } | null)
    ?.ist_bauprojekt;

  const ist_bauprojekt =
    explicitBauprojekt === true
      ? true
      : explicitBauprojekt === false
        ? false
        : projektHatBauleistung(projektGewerkSlugs, opts.alleGewerke);
  const projektDoks = opts.alleDokumente.filter(
    (d) => d.auftrag_id === opts.auftragId || !d.auftrag_id
  );

  const stammRaw = buildPartnerStammCompliance({
    typen: opts.typen,
    dokumente: opts.alleDokumente,
    handwerkerGewerke: opts.handwerkerGewerke,
    alleGewerke: opts.alleGewerke,
  });

  const leistungRaw = buildProjektCompliance({
    typen: opts.typen,
    dokumente: projektDoks,
    auftragId: opts.auftragId,
    projektGewerkSlugs,
    handwerkerGewerke: opts.handwerkerGewerke,
    alleGewerke: opts.alleGewerke,
  });

  const [allgemein, meister, leistung] = await Promise.all([
    enrichComplianceWithSignedUrls(stammRaw.allgemein, opts.alleDokumente),
    enrichComplianceWithSignedUrls(stammRaw.meister, opts.alleDokumente),
    enrichComplianceWithSignedUrls(leistungRaw, projektDoks),
  ]);

  const compliance_bauauftragRaw = buildBauprojektNachunternehmerCompliance({
    typen: opts.typen,
    dokumente: projektDoks,
    stamm: [...stammRaw.allgemein, ...stammRaw.meister],
    projekt: leistungRaw,
    auftragId: opts.auftragId,
    ist_bauprojekt,
  });
  const compliance_bauauftrag = await enrichComplianceWithSignedUrls(
    compliance_bauauftragRaw,
    projektDoks
  );

  const dokumente_zeilen = dokumenteZeilenFromKontext(
    projektvertrag,
    opts.alleDokumente,
    opts.auftragId
  );

  for (let i = 0; i < dokumente_zeilen.length; i++) {
    const row = dokumente_zeilen[i];
    if (row.href) continue;
    const doc = opts.alleDokumente.find((d) => d.id === row.id);
    if (doc) {
      dokumente_zeilen[i] = {
        ...row,
        href: (await resolvePartnerFileUrl(doc.datei_url)) ?? undefined,
      };
    }
  }

  return {
    auftrag_id: opts.auftragId,
    projektvertrag_bestaetigt_am,
    projektvertrag,
    projektvertrag_bereit: hasGueltigerProjektvertrag(projektvertrag),
    ist_bauprojekt,
    projekt_gewerk_slugs: projektGewerkSlugs,
    ...stammKontext({ allgemein, meister }, leistung, compliance_bauauftrag),
    dokumente_zeilen,
  };
}

export async function buildPartnerStammKontext(handwerkerId: string): Promise<
  Pick<
    PartnerVertragKontext,
    | "compliance_allgemein"
    | "compliance_meister"
    | "compliance_stamm"
  >
> {
  const [typen, alleGewerke, handwerkerGewerke, dokumente] = await Promise.all([
    loadComplianceTypen(),
    loadPartnerGewerke(),
    loadHandwerkerGewerke(handwerkerId),
    loadPartnerDokumente(handwerkerId, []),
  ]);

  const stammRaw = buildPartnerStammCompliance({
    typen,
    dokumente,
    handwerkerGewerke,
    alleGewerke,
  });

  const [allgemein, meister] = await Promise.all([
    enrichComplianceWithSignedUrls(stammRaw.allgemein, dokumente),
    enrichComplianceWithSignedUrls(stammRaw.meister, dokumente),
  ]);

  return {
    compliance_allgemein: allgemein,
    compliance_meister: meister,
    compliance_stamm: [...allgemein, ...meister],
  };
}

export async function loadHandwerkerComplianceBundle(handwerkerId: string): Promise<{
  typen: PartnerComplianceTypRow[];
  dokumente: PartnerDokumentRow[];
  handwerkerGewerke: string[] | null;
  alleGewerke: PartnerGewerkRow[];
  stamm: Pick<PartnerVertragKontext, "compliance_allgemein" | "compliance_meister" | "compliance_stamm">;
  auftragIdByAngebotId: Map<string, string>;
  vertragByAuftragId: Map<string, PartnerVertragKontext>;
}> {
  const empty = {
    typen: [] as PartnerComplianceTypRow[],
    dokumente: [] as PartnerDokumentRow[],
    handwerkerGewerke: null as string[] | null,
    alleGewerke: [] as PartnerGewerkRow[],
    stamm: {
      compliance_allgemein: [],
      compliance_meister: [],
      compliance_stamm: [],
    },
    auftragIdByAngebotId: new Map<string, string>(),
    vertragByAuftragId: new Map<string, PartnerVertragKontext>(),
  };

  try {
    const [typen, alleGewerke, handwerkerGewerke] = await Promise.all([
      loadComplianceTypen(),
      loadPartnerGewerke(),
      loadHandwerkerGewerke(handwerkerId),
    ]);

    const {data: hwAuftraege, error: __dbErr397_9} = await supabaseAdmin
      .from("auftrag_handwerker")
      .select("auftrag_id")
      .eq("handwerker_id", handwerkerId);
    if (__dbErr397_9) logDbError('lib/partner/load-partner-compliance-data:auftrag_handwerker', __dbErr397_9)
    const {data: posAuftraege, error: __dbErr398_10} = await supabaseAdmin
      .from("auftrag_positionen")
      .select("auftrag_id")
      .eq("handwerker_id", handwerkerId);
    if (__dbErr398_10) logDbError('lib/partner/load-partner-compliance-data:auftrag_positionen', __dbErr398_10)
    const hwAuftragIds = Array.from(
      new Set([
        ...(hwAuftraege ?? []).map((r) => String((r as { auftrag_id: string }).auftrag_id)),
        ...(posAuftraege ?? []).map((r) => String((r as { auftrag_id: string }).auftrag_id)),
      ])
    );

    const auftragIdByAngebotId = new Map<string, string>();
    const auftragIds: string[] = [...hwAuftragIds];

    if (hwAuftragIds.length) {
      const {data: auftraegeRows, error: __dbErr399_11} = await supabaseAdmin
        .from("auftraege")
        .select("id, angebot_id")
        .in("id", hwAuftragIds)
        .not("angebot_id", "is", null);
      if (__dbErr399_11) logDbError('lib/partner/load-partner-compliance-data:auftraege', __dbErr399_11)
      for (const r of auftraegeRows ?? []) {
        const raw = r as { id: string; angebot_id: string };
        auftragIdByAngebotId.set(String(raw.angebot_id), String(raw.id));
      }
    }

    const {data: angebotHwRows, error: __dbErr400_12} = await supabaseAdmin
      .from("angebot_handwerker")
      .select("angebot_id")
      .eq("handwerker_id", handwerkerId);
    if (__dbErr400_12) logDbError('lib/partner/load-partner-compliance-data:angebot_handwerker', __dbErr400_12)
    const angebotIds = (angebotHwRows ?? []).map((r) =>
      String((r as { angebot_id: string }).angebot_id)
    );

    if (angebotIds.length) {
      const {data: aufByAngebot, error: __dbErr401_13} = await supabaseAdmin
        .from("auftraege")
        .select("id, angebot_id")
        .in("angebot_id", angebotIds);
      if (__dbErr401_13) logDbError('lib/partner/load-partner-compliance-data:auftraege', __dbErr401_13)
      for (const r of aufByAngebot ?? []) {
        const raw = r as { id: string; angebot_id: string };
        const aid = String(raw.id);
        const angId = String(raw.angebot_id);
        auftragIdByAngebotId.set(angId, aid);
        if (!auftragIds.includes(aid)) auftragIds.push(aid);
      }
    }

    const dokumente = await loadPartnerDokumente(handwerkerId, auftragIds);
    const vertragByAuftragId = new Map<string, PartnerVertragKontext>();

    const stammRaw = buildPartnerStammCompliance({
      typen,
      dokumente,
      handwerkerGewerke,
      alleGewerke,
    });
    const [allgemein, meister] = await Promise.all([
      enrichComplianceWithSignedUrls(stammRaw.allgemein, dokumente),
      enrichComplianceWithSignedUrls(stammRaw.meister, dokumente),
    ]);
    const stamm = {
      compliance_allgemein: allgemein,
      compliance_meister: meister,
      compliance_stamm: [...allgemein, ...meister],
    };

    const uniqueAuftragIds = Array.from(new Set(auftragIds));
    await Promise.all(
      uniqueAuftragIds.map(async (auftragId) => {
        const ctx = await buildVertragKontextForAuftrag({
          handwerkerId,
          auftragId,
          alleDokumente: dokumente,
          typen,
          handwerkerGewerke,
          alleGewerke,
        });
        vertragByAuftragId.set(auftragId, ctx);
      })
    );

    return {
      typen,
      dokumente,
      handwerkerGewerke,
      alleGewerke,
      stamm,
      auftragIdByAngebotId,
      vertragByAuftragId,
    };
  } catch (err) {
    console.warn("[partner] compliance bundle:", err);
    return empty;
  }
}

export function vertragKontextForAngebot(
  angebotId: string,
  maps: {
    auftragIdByAngebotId: Map<string, string>;
    vertragByAuftragId: Map<string, PartnerVertragKontext>;
  }
): PartnerVertragKontext | null {
  const auftragId = maps.auftragIdByAngebotId.get(angebotId);
  if (!auftragId) return null;
  return maps.vertragByAuftragId.get(auftragId) ?? null;
}
