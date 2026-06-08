import {
  buildComplianceChecklist,
  enrichComplianceWithSignedUrls,
  hasGueltigerProjektvertrag,
  mapProjektvertragRow,
  type PartnerComplianceItem,
  type PartnerComplianceTypRow,
  type PartnerDokumentRow,
  type PartnerProjektvertrag,
} from "@/lib/partner/partner-compliance";
import { fetchCrmProjektvertrag } from "@/lib/partner/partner-crm-api";
import { resolvePartnerFileUrl } from "@/lib/partner/partner-storage";
import { supabaseAdmin } from "@/lib/supabase";

export type PartnerVertragKontext = {
  auftrag_id: string | null;
  projektvertrag_bestaetigt_am: string | null;
  projektvertrag: PartnerProjektvertrag | null;
  projektvertrag_bereit: boolean;
  compliance_stamm: PartnerComplianceItem[];
  compliance_projekt: PartnerComplianceItem[];
  dokumente_zeilen: Array<{
    id: string;
    datum?: string | null;
    name: string;
    href?: string;
  }>;
};

let typenCache: PartnerComplianceTypRow[] | null = null;

export async function loadComplianceTypen(): Promise<PartnerComplianceTypRow[]> {
  if (typenCache) return typenCache;
  const { data } = await supabaseAdmin
    .from("compliance_dokument_typen")
    .select(
      "slug, bezeichnung, beschreibung, pflicht_bauprojekt, mehrfach_erlaubt, kategorie, sort_order, scope"
    )
    .eq("aktiv", true)
    .in("scope", ["stamm", "bauprojekt", "gewerk"])
    .order("sort_order", { ascending: true });

  typenCache = (data ?? []) as PartnerComplianceTypRow[];
  return typenCache;
}

async function loadPartnerDokumente(
  handwerkerId: string,
  auftragIds: string[]
): Promise<PartnerDokumentRow[]> {
  let query = supabaseAdmin
    .from("partner_dokumente")
    .select(
      "id, typ, bezeichnung, gueltig_bis, datei_url, status, ablehnung_grund, hochgeladen_am, auftrag_id"
    )
    .eq("handwerker_id", handwerkerId)
    .order("hochgeladen_am", { ascending: false });

  if (auftragIds.length) {
    query = query.or(
      `auftrag_id.is.null,auftrag_id.in.(${auftragIds.join(",")})`
    );
  } else {
    query = query.is("auftrag_id", null);
  }

  const { data } = await query;
  return (data ?? []) as PartnerDokumentRow[];
}

async function loadProjektvertragDb(
  handwerkerId: string,
  auftragId: string
): Promise<PartnerProjektvertrag | null> {
  const { data } = await supabaseAdmin
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

  return mapProjektvertragRow(data as Record<string, unknown> | null);
}

async function loadProjektvertragBestaetigtAm(
  handwerkerId: string,
  auftragId: string
): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("auftrag_handwerker")
    .select("projektvertrag_bestaetigt_am")
    .eq("handwerker_id", handwerkerId)
    .eq("auftrag_id", auftragId)
    .maybeSingle();

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
    if (auftragId && d.auftrag_id !== auftragId && d.auftrag_id) continue;
    rows.push({
      id: d.id,
      datum: d.hochgeladen_am,
      name: d.bezeichnung?.trim() || d.typ,
    });
  }

  return rows;
}

export async function buildVertragKontextForAuftrag(opts: {
  handwerkerId: string;
  auftragId: string;
  gewerkName?: string;
  alleDokumente: PartnerDokumentRow[];
  typen: PartnerComplianceTypRow[];
}): Promise<PartnerVertragKontext> {
  const dbVertrag = await loadProjektvertragDb(opts.handwerkerId, opts.auftragId);
  const projektvertrag = await mergeVertragFromCrm(opts.auftragId, dbVertrag);
  const projektvertrag_bestaetigt_am = await loadProjektvertragBestaetigtAm(
    opts.handwerkerId,
    opts.auftragId
  );

  const projektDoks = opts.alleDokumente.filter(
    (d) => d.auftrag_id === opts.auftragId || !d.auftrag_id
  );

  const compliance_stamm = await enrichComplianceWithSignedUrls(
    buildComplianceChecklist({
      typen: opts.typen,
      dokumente: opts.alleDokumente,
      scopeFilter: ["stamm"],
    }),
    opts.alleDokumente
  );

  const compliance_projekt = await enrichComplianceWithSignedUrls(
    buildComplianceChecklist({
      typen: opts.typen,
      dokumente: projektDoks,
      scopeFilter: ["bauprojekt", "gewerk"],
      auftragId: opts.auftragId,
    }),
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
    compliance_stamm,
    compliance_projekt,
    dokumente_zeilen,
  };
}

export async function loadHandwerkerComplianceBundle(handwerkerId: string): Promise<{
  typen: PartnerComplianceTypRow[];
  dokumente: PartnerDokumentRow[];
  auftragIdByAngebotId: Map<string, string>;
  vertragByAuftragId: Map<string, PartnerVertragKontext>;
}> {
  const empty = {
    typen: [] as PartnerComplianceTypRow[],
    dokumente: [] as PartnerDokumentRow[],
    auftragIdByAngebotId: new Map<string, string>(),
    vertragByAuftragId: new Map<string, PartnerVertragKontext>(),
  };

  try {
  const typen = await loadComplianceTypen();

  const { data: hwAuftraege } = await supabaseAdmin
    .from("auftrag_handwerker")
    .select("auftrag_id")
    .eq("handwerker_id", handwerkerId);

  const { data: posAuftraege } = await supabaseAdmin
    .from("auftrag_positionen")
    .select("auftrag_id")
    .eq("handwerker_id", handwerkerId);

  const hwAuftragIds = Array.from(
    new Set([
      ...(hwAuftraege ?? []).map((r) => String((r as { auftrag_id: string }).auftrag_id)),
      ...(posAuftraege ?? []).map((r) => String((r as { auftrag_id: string }).auftrag_id)),
    ])
  );

  const auftragIdByAngebotId = new Map<string, string>();
  const auftragIds: string[] = [...hwAuftragIds];

  if (hwAuftragIds.length) {
    const { data: auftraegeRows } = await supabaseAdmin
      .from("auftraege")
      .select("id, angebot_id")
      .in("id", hwAuftragIds)
      .not("angebot_id", "is", null);

    for (const r of auftraegeRows ?? []) {
      const raw = r as { id: string; angebot_id: string };
      auftragIdByAngebotId.set(String(raw.angebot_id), String(raw.id));
    }
  }

  const { data: angebotHwRows } = await supabaseAdmin
    .from("angebot_handwerker")
    .select("angebot_id")
    .eq("handwerker_id", handwerkerId);

  const angebotIds = (angebotHwRows ?? []).map((r) =>
    String((r as { angebot_id: string }).angebot_id)
  );

  if (angebotIds.length) {
    const { data: aufByAngebot } = await supabaseAdmin
      .from("auftraege")
      .select("id, angebot_id")
      .in("angebot_id", angebotIds);

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

  const uniqueAuftragIds = Array.from(new Set(auftragIds));
  await Promise.all(
    uniqueAuftragIds.map(async (auftragId) => {
      const ctx = await buildVertragKontextForAuftrag({
        handwerkerId,
        auftragId,
        alleDokumente: dokumente,
        typen,
      });
      vertragByAuftragId.set(auftragId, ctx);
    })
  );

  return { typen, dokumente, auftragIdByAngebotId, vertragByAuftragId };
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
