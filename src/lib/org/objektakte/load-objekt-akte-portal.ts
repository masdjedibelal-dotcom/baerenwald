import { computeObjektKpisPortal } from "@/lib/org/objektakte/compute-objekt-kpis";
import { resolveObjektVorgangKosten } from "@/lib/org/objektakte/resolve-objekt-vorgang-kosten";
import type {
  ObjektAktePortalPayload,
  ObjektAnlagePortal,
  ObjektHistorieRowPortal,
} from "@/lib/org/objektakte/types";
import { meldeKategorieLabel } from "@/lib/org/melde-kategorien";
import { leadBelongsToObjekt } from "@/lib/org/match-lead-objekt";
import {
  plattformStatusLabel,
  resolvePlattformStatus,
} from "@/lib/vorgang/plattform-status";
import { supabaseAdmin } from "@/lib/supabase";

function normalizeGewerkJoin(
  raw: { name?: string } | { name?: string }[] | null | undefined
): string | null {
  if (!raw) return null;
  const row = Array.isArray(raw) ? raw[0] : raw;
  return row?.name?.trim() || null;
}

function historieTitel(lead: {
  situation?: string | null;
  melder_name?: string | null;
  bereiche?: string[] | null;
  funnel_daten?: unknown;
}): string {
  const sit = lead.situation?.trim();
  if (sit) return sit;
  const fd = lead.funnel_daten as { melde_kategorie?: string } | null | undefined;
  const k = fd?.melde_kategorie;
  const kat =
    k === "notfall" || k === "schaden" || k === "reparatur" || k === "sonstiges"
      ? meldeKategorieLabel(k)
      : null;
  if (kat && kat !== "—") return kat;
  const melder = lead.melder_name?.trim();
  if (melder) return `Meldung · ${melder}`;
  const b = lead.bereiche?.find((x: string) => x?.trim())?.trim();
  return b || "Vorgang";
}

/** Read-only Objekt-Akte für HV-Portal — null-tolerant. */
export async function loadObjektAktePortal(
  kundeId: string,
  objektId: string
): Promise<ObjektAktePortalPayload | null> {
  const kid = kundeId.trim();
  const oid = objektId.trim();
  if (!kid || !oid) return null;

  const { data: objekt } = await supabaseAdmin
    .from("kunden_objekte")
    .select("id, kunde_id, titel, strasse, hausnummer, plz, ort")
    .eq("id", oid)
    .eq("kunde_id", kid)
    .maybeSingle();

  if (!objekt) return null;

  const anlagenFullSelect =
    "id, bezeichnung, standort, status, garantie_bis, hersteller, modell, gewerke(name), objekt_einheiten(bezeichnung)";
  const anlagenBasicSelect =
    "id, bezeichnung, standort, status, gewerke(name), objekt_einheiten(bezeichnung)";

  let anlagenRows: Array<Record<string, unknown>> = []

  const anlagenFull = await supabaseAdmin
    .from("objekt_anlagen")
    .select(anlagenFullSelect)
    .eq("kunde_objekt_id", oid)
    .order("bezeichnung", { ascending: true });

  if (!anlagenFull.error) {
    anlagenRows = (anlagenFull.data ?? []) as Array<Record<string, unknown>>;
  } else if (
    /garantie|hersteller|modell|objekt_anlagen|does not exist|Could not find/i.test(
      anlagenFull.error.message
    )
  ) {
    const anlagenBasic = await supabaseAdmin
      .from("objekt_anlagen")
      .select(anlagenBasicSelect)
      .eq("kunde_objekt_id", oid)
      .order("bezeichnung", { ascending: true });
    if (!anlagenBasic.error) {
      anlagenRows = (anlagenBasic.data ?? []) as Array<Record<string, unknown>>;
    } else {
      console.warn("[loadObjektAktePortal] anlagen:", anlagenBasic.error.message);
    }
  } else {
    console.warn("[loadObjektAktePortal] anlagen:", anlagenFull.error.message);
  }

  const anlageIds = (anlagenRows ?? []).map((a) => String(a.id));
  const vorgangCounts: Record<string, number> = {};
  if (anlageIds.length) {
    const { data: countRows } = await supabaseAdmin
      .from("leads")
      .select("objekt_anlage_id")
      .in("objekt_anlage_id", anlageIds);
    for (const row of countRows ?? []) {
      const id = String(row.objekt_anlage_id ?? "");
      if (id) vorgangCounts[id] = (vorgangCounts[id] ?? 0) + 1;
    }
  }

  const anlagen: ObjektAnlagePortal[] = (anlagenRows ?? []).map((row) => {
    const einheitRaw = row.objekt_einheiten as
      | { bezeichnung?: string }
      | { bezeichnung?: string }[]
      | null;
    const einheit = Array.isArray(einheitRaw) ? einheitRaw[0] : einheitRaw;
    return {
      id: String(row.id),
      bezeichnung: String(row.bezeichnung ?? "").trim() || "—",
      gewerkName: normalizeGewerkJoin(
        row.gewerke as { name?: string } | { name?: string }[] | null
      ),
      standort: (row.standort as string | null)?.trim() || null,
      einheitLabel: einheit?.bezeichnung?.trim() || null,
      status: String(row.status ?? "aktiv"),
      vorgangCount: vorgangCounts[String(row.id)] ?? 0,
      garantieBis: (row.garantie_bis as string | null)?.slice(0, 10) || null,
      hersteller: (row.hersteller as string | null)?.trim() || null,
      modell: (row.modell as string | null)?.trim() || null,
    };
  });

  const leadFullSelect =
    "id, situation, created_at, updated_at, melder_einheit, melder_name, bereiche, objekt_anlage_id, kunde_objekt_id, funnel_daten, strasse, hausnummer, plz, ort, vorgang_phase, hv_meldung_status, org_freigabe_status, ist_wiederkehrend, objekt_anlagen(id, bezeichnung, gewerke(name))";
  const leadIdSelect =
    "id, situation, created_at, updated_at, melder_einheit, melder_name, bereiche, objekt_anlage_id, kunde_objekt_id, funnel_daten, strasse, hausnummer, plz, ort, vorgang_phase, hv_meldung_status, org_freigabe_status, ist_wiederkehrend";
  const leadLegacySelect =
    "id, situation, created_at, updated_at, melder_einheit, melder_name, bereiche, kunde_objekt_id, funnel_daten, strasse, hausnummer, plz, ort, vorgang_phase, hv_meldung_status, org_freigabe_status, ist_wiederkehrend";

  let leadRows: Array<Record<string, unknown>> = [];

  const leadFull = await supabaseAdmin
    .from("leads")
    .select(leadFullSelect)
    .eq("auftraggeber_kunde_id", kid)
    .is("geloescht_am", null);

  if (!leadFull.error) {
    leadRows = (leadFull.data ?? []) as Array<Record<string, unknown>>;
  } else if (
    /objekt_anlage|objekt_anlagen|does not exist|Could not find/i.test(leadFull.error.message)
  ) {
    const leadIdOnly = await supabaseAdmin
      .from("leads")
      .select(leadIdSelect)
      .eq("auftraggeber_kunde_id", kid)
      .is("geloescht_am", null);
    if (!leadIdOnly.error) {
      leadRows = (leadIdOnly.data ?? []) as Array<Record<string, unknown>>;
    } else if (
      /objekt_anlage|does not exist|Could not find/i.test(leadIdOnly.error.message)
    ) {
      const leadLegacy = await supabaseAdmin
        .from("leads")
        .select(leadLegacySelect)
        .eq("auftraggeber_kunde_id", kid)
        .is("geloescht_am", null);
      if (!leadLegacy.error) {
        leadRows = (leadLegacy.data ?? []) as Array<Record<string, unknown>>;
      } else {
        console.warn("[loadObjektAktePortal] leads:", leadLegacy.error.message);
      }
    } else {
      console.warn("[loadObjektAktePortal] leads:", leadIdOnly.error.message);
    }
  } else {
    console.warn("[loadObjektAktePortal] leads:", leadFull.error.message);
  }

  if (!leadRows.length && leadFull.error) {
    return {
      anlagen,
      historie: [],
      kpis: computeObjektKpisPortal([], anlagen.length),
    };
  }

  const objektForMatch = {
    id: oid,
    strasse: objekt.strasse,
    hausnummer: objekt.hausnummer,
    plz: objekt.plz,
    ort: objekt.ort,
  };

  const objektLeads = (leadRows ?? []).filter((l) =>
    leadBelongsToObjekt(l, objektForMatch)
  );
  const leadIds = objektLeads.map((l) => String(l.id));

  if (!leadIds.length) {
    return {
      anlagen,
      historie: [],
      kpis: computeObjektKpisPortal([], anlagen.length),
    };
  }

  const [{ data: angebote }, { data: auftraege }] = await Promise.all([
    supabaseAdmin
      .from("angebote")
      .select("id, lead_id, status, gesamt_fix, gesamt_min, gesamt_max")
      .in("lead_id", leadIds),
    supabaseAdmin
      .from("auftraege")
      .select("id, lead_id, angebot_id, status")
      .in("lead_id", leadIds),
  ]);

  const auftragIds = (auftraege ?? []).map((a) => String(a.id));
  const angebotIds = (angebote ?? []).map((a) => String(a.id));

  let rechnungen: Array<{
    auftrag_id?: string | null;
    angebot_id?: string | null;
    status: string;
    brutto?: number | null;
    rechnung_art?: string | null;
    created_at: string;
    updated_at?: string | null;
  }> = [];

  if (auftragIds.length || angebotIds.length) {
    let q = supabaseAdmin
      .from("rechnungen")
      .select(
        "auftrag_id, angebot_id, status, brutto, rechnung_art, created_at, updated_at"
      );
    if (auftragIds.length && angebotIds.length) {
      q = q.or(
        `auftrag_id.in.(${auftragIds.join(",")}),angebot_id.in.(${angebotIds.join(",")})`
      );
    } else if (auftragIds.length) {
      q = q.in("auftrag_id", auftragIds);
    } else {
      q = q.in("angebot_id", angebotIds);
    }
    const { data, error } = await q;
    if (error) console.warn("[loadObjektAktePortal] rechnungen:", error.message);
    rechnungen = (data ?? []) as typeof rechnungen;
  }

  const angeboteByLead = new Map<string, NonNullable<typeof angebote>>();
  for (const a of angebote ?? []) {
    const lid = String(a.lead_id ?? "");
    if (!lid) continue;
    const list = angeboteByLead.get(lid) ?? [];
    list.push(a);
    angeboteByLead.set(lid, list);
  }
  const auftraegeByLead = new Map<string, NonNullable<typeof auftraege>>();
  for (const a of auftraege ?? []) {
    const lid = String(a.lead_id ?? "");
    if (!lid) continue;
    const list = auftraegeByLead.get(lid) ?? [];
    list.push(a);
    auftraegeByLead.set(lid, list);
  }

  const historie: ObjektHistorieRowPortal[] = objektLeads.map((lead) => {
    const lid = String(lead.id);
    const leadAuf = auftraegeByLead.get(lid) ?? [];
    const leadAng = angeboteByLead.get(lid) ?? [];
    const aufIds = new Set(leadAuf.map((a) => String(a.id)));
    const angIds = new Set(leadAng.map((a) => String(a.id)));
    const recs = rechnungen.filter(
      (r) =>
        (r.auftrag_id && aufIds.has(String(r.auftrag_id))) ||
        (r.angebot_id && angIds.has(String(r.angebot_id)))
    );

    const kosten = resolveObjektVorgangKosten({
      rechnungen: recs,
      auftraege: leadAuf as Array<{ status: string; angebot_id?: string | null }>,
      angebote: leadAng as Array<{
        id?: string;
        gesamt_fix?: number | null;
        gesamt_min?: number | null;
        gesamt_max?: number | null;
      }>,
    });

    const anlageRaw = lead.objekt_anlagen as
      | { bezeichnung?: string; gewerke?: { name?: string } | { name?: string }[] | null }
      | { bezeichnung?: string; gewerke?: { name?: string } | { name?: string }[] | null }[]
      | null;
    const anlage = Array.isArray(anlageRaw) ? anlageRaw[0] : anlageRaw;
    const anlageLabel = anlage?.bezeichnung?.trim() || null;
    const gewerkFromAnlage = normalizeGewerkJoin(anlage?.gewerke ?? null);
    const gewerkFromBereich =
      (lead.bereiche as string[] | null | undefined)
        ?.find((x: string) => x?.trim())
        ?.trim() || null;

    const statusKey = resolvePlattformStatus(lead);
    const datum =
      (lead.updated_at as string | null)?.trim() ||
      (lead.created_at as string | null)?.trim() ||
      new Date().toISOString();

    return {
      leadId: lid,
      datum,
      titel: historieTitel(lead),
      einheitLabel: (lead.melder_einheit as string | null)?.trim() || null,
      anlageLabel,
      anlageId: (lead.objekt_anlage_id as string | null)?.trim() || null,
      gewerkLabel: gewerkFromAnlage || gewerkFromBereich,
      statusLabel: plattformStatusLabel(statusKey),
      kostenLabel: kosten.label,
      kostenEuro: kosten.euro,
      istWiederkehrend: lead.ist_wiederkehrend === true,
    };
  });

  historie.sort((a, b) => b.datum.localeCompare(a.datum));

  return {
    anlagen,
    historie,
    kpis: computeObjektKpisPortal(historie, anlagen.length),
  };
}
