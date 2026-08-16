import { getPortalDataForKunde } from "@/lib/portal/get-portal-data";
import {
  loadMieterHvBrand,
  type MieterHvBrand,
} from "@/lib/portal/load-mieter-hv-brand";
import { resolvePortalObjekt } from "@/lib/portal/portal-objekt";
import {
  EIGENTUEMER_DEFAULT_SCHWELLE_EUR,
  filterLeadsByEigentuemerObjekte,
} from "@/lib/portal2/eigentuemer";
import type { OrganisationObjekt } from "@/lib/org/types";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export type EigentuemerPortalObjekt = Pick<
  OrganisationObjekt,
  | "id"
  | "kunde_id"
  | "titel"
  | "strasse"
  | "hausnummer"
  | "plz"
  | "ort"
  | "einheiten_hinweis"
  | "notizen_intern"
  | "freigabe_schwelle_eur"
  | "created_at"
  | "cover_url"
>;

/** Mieter am Objekt (für Eigentümer-Stammdaten). */
export type EigentuemerPortalMieter = {
  id: string;
  kunde_objekt_id: string;
  name: string;
  email: string | null;
  telefon: string | null;
  einheitBezeichnung: string | null;
};

/** Zugeordnete Einheit des Eigentümers (Portal-Liste). */
export type EigentuemerPortalEinheit = {
  id: string;
  bezeichnung: string;
  etage: string | null;
  wohnflaeche_m2: number | null;
  kunde_objekt_id: string;
  objektTitel: string;
  objektStrasse: string;
  objektPlzOrt: string;
};

type PortalData = NonNullable<Awaited<ReturnType<typeof getPortalDataForKunde>>>;

async function loadMieterByObjektIds(
  objektIds: string[]
): Promise<Record<string, EigentuemerPortalMieter[]>> {
  const empty: Record<string, EigentuemerPortalMieter[]> = {};
  if (!objektIds.length) return empty;

  const { data: einheiten, error: ehErr } = await supabaseAdmin
    .from("objekt_einheiten")
    .select("id, bezeichnung, kunde_objekt_id")
    .in("kunde_objekt_id", objektIds);

  if (ehErr || !einheiten?.length) {
    if (ehErr) {
      console.warn("[eigentuemer-portal] objekt_einheiten:", ehErr.message);
    }
    return empty;
  }

  const einheitById = new Map(
    einheiten.map((e) => [
      String((e as { id: string }).id),
      e as {
        id: string;
        bezeichnung?: string | null;
        kunde_objekt_id: string;
      },
    ])
  );
  const einheitIds = Array.from(einheitById.keys());

  type BewohnerRow = {
    id: string;
    name?: string | null;
    email?: string | null;
    telefon?: string | null;
    rolle?: string | null;
    objekt_einheit_id: string;
  };

  let bewohner: BewohnerRow[] | null = null;
  let bewErr: { message: string } | null = null;

  {
    const res = await supabaseAdmin
      .from("einheit_bewohner")
      .select("id, name, email, telefon, rolle, objekt_einheit_id")
      .in("objekt_einheit_id", einheitIds)
      .eq("aktiv", true)
      .is("anonymisiert_am", null)
      .order("created_at", { ascending: true });
    bewohner = (res.data as BewohnerRow[] | null) ?? null;
    bewErr = res.error;
  }

  if (bewErr && /rolle/i.test(bewErr.message)) {
    const fb = await supabaseAdmin
      .from("einheit_bewohner")
      .select("id, name, email, telefon, objekt_einheit_id")
      .in("objekt_einheit_id", einheitIds)
      .eq("aktiv", true)
      .is("anonymisiert_am", null)
      .order("created_at", { ascending: true });
    bewohner = (fb.data as BewohnerRow[] | null) ?? null;
    bewErr = fb.error;
  }

  if (bewErr) {
    console.warn("[eigentuemer-portal] einheit_bewohner:", bewErr.message);
    return empty;
  }

  const byObjekt: Record<string, EigentuemerPortalMieter[]> = {};
  for (const row of bewohner ?? []) {
    if (row.rolle === "eigentuemer") continue;
    const einheit = einheitById.get(String(row.objekt_einheit_id));
    if (!einheit) continue;
    const oid = String(einheit.kunde_objekt_id);
    const name = String(row.name ?? "").trim();
    if (!name) continue;
    if (!byObjekt[oid]) byObjekt[oid] = [];
    byObjekt[oid]!.push({
      id: String(row.id),
      kunde_objekt_id: oid,
      name,
      email: row.email?.trim() || null,
      telefon: row.telefon?.trim() || null,
      einheitBezeichnung: einheit.bezeichnung?.trim() || null,
    });
  }
  return byObjekt;
}

async function loadEinheitenForEigentuemerPortal(
  portalKundeId: string
): Promise<{
  einheiten: EigentuemerPortalEinheit[];
  objektIdsFromEinheiten: string[];
}> {
  const { data: bewRows, error } = await supabaseAdmin
    .from("einheit_bewohner")
    .select("objekt_einheit_id")
    .eq("portal_kunde_id", portalKundeId)
    .eq("rolle", "eigentuemer")
    .eq("aktiv", true)
    .is("anonymisiert_am", null);

  if (error) {
    console.warn("[eigentuemer-portal] einheiten bewohner:", error.message);
    return { einheiten: [], objektIdsFromEinheiten: [] };
  }

  const einheitIds = Array.from(
    new Set(
      (bewRows ?? [])
        .map((r) => String((r as { objekt_einheit_id?: string }).objekt_einheit_id ?? "").trim())
        .filter(Boolean)
    )
  );
  if (!einheitIds.length) {
    return { einheiten: [], objektIdsFromEinheiten: [] };
  }

  const { data: einheitRows } = await supabaseAdmin
    .from("objekt_einheiten")
    .select("id, bezeichnung, etage, wohnflaeche_m2, kunde_objekt_id")
    .in("id", einheitIds)
    .eq("aktiv", true);

  const objektIds = Array.from(
    new Set(
      (einheitRows ?? [])
        .map((e) => String(e.kunde_objekt_id ?? "").trim())
        .filter(Boolean)
    )
  );

  const objektById = new Map<
    string,
    {
      titel: string;
      strasse: string;
      plzOrt: string;
    }
  >();
  if (objektIds.length) {
    const { data: objs } = await supabaseAdmin
      .from("kunden_objekte")
      .select("id, titel, strasse, hausnummer, plz, ort")
      .in("id", objektIds);
    for (const o of objs ?? []) {
      const strasse = [o.strasse, o.hausnummer]
        .map((x) => String(x ?? "").trim())
        .filter(Boolean)
        .join(" ");
      const plzOrt = [o.plz, o.ort]
        .map((x) => String(x ?? "").trim())
        .filter(Boolean)
        .join(" ");
      objektById.set(String(o.id), {
        titel: String(o.titel ?? "").trim() || "Objekt",
        strasse,
        plzOrt,
      });
    }
  }

  const einheiten: EigentuemerPortalEinheit[] = (einheitRows ?? [])
    .map((e) => {
      const oid = String(e.kunde_objekt_id ?? "");
      const obj = objektById.get(oid);
      return {
        id: String(e.id),
        bezeichnung: String(e.bezeichnung ?? "").trim() || "Einheit",
        etage: e.etage != null ? String(e.etage).trim() || null : null,
        wohnflaeche_m2:
          e.wohnflaeche_m2 != null && Number.isFinite(Number(e.wohnflaeche_m2))
            ? Number(e.wohnflaeche_m2)
            : null,
        kunde_objekt_id: oid,
        objektTitel: obj?.titel ?? "Objekt",
        objektStrasse: obj?.strasse ?? "",
        objektPlzOrt: obj?.plzOrt ?? "",
      };
    })
    .sort((a, b) => {
      const o = a.objektTitel.localeCompare(b.objektTitel, "de");
      if (o !== 0) return o;
      return a.bezeichnung.localeCompare(b.bezeichnung, "de");
    });

  return { einheiten, objektIdsFromEinheiten: objektIds };
}

type LeadRow = PortalData["leads"][number] & {
  kunde_objekt_id?: string | null;
  eigentuemer_freigabe_status?: string | null;
  preis_max?: number | null;
  budget_ca?: number | null;
};

/**
 * Eigentümer-Portal-Daten.
 * Sichtbarkeit: zugeordnete Einheiten (+ Objekte daraus) und Vorgänge.
 */
export async function getEigentuemerPortalData(kundeId: string): Promise<{
  kunde: PortalData["kunde"] & {
    eigentuemer_freigabe_schwelle_eur: number;
  };
  objekte: EigentuemerPortalObjekt[];
  /** Zugeordnete Einheiten (primäre Portal-Liste). */
  einheiten: EigentuemerPortalEinheit[];
  objektIds: string[];
  schwelleEur: number;
  leads: LeadRow[];
  angebote: PortalData["angebote"];
  auftraege: PortalData["auftraege"];
  mieterFeedbackByLeadId: PortalData["mieterFeedbackByLeadId"];
  mieterByObjektId: Record<string, EigentuemerPortalMieter[]>;
  /** White-Label der Hausverwaltung — nie MeinBärenwald im Header. */
  hausverwaltungBrand: MieterHvBrand | null;
} | null> {
  if (!isSupabaseConfigured()) return null;

  const id = kundeId.trim();
  if (!id) return null;

  const { data: kundePrimary, error: kundeErr } = await supabaseAdmin
    .from("kunden")
    .select(
      "id, name, email, plz, ort, adresse, auth_user_id, portal_modus, freigabe_schwelle_eur, eigentuemer_freigabe_schwelle_eur"
    )
    .eq("id", id)
    .maybeSingle();

  let kundeRow = (!kundeErr ? kundePrimary : null) as {
    id: string;
    name?: string | null;
    email?: string | null;
    plz?: string | null;
    ort?: string | null;
    adresse?: string | null;
    auth_user_id?: string | null;
    portal_modus?: string | null;
    freigabe_schwelle_eur?: number | null;
    eigentuemer_freigabe_schwelle_eur?: number | null;
  } | null;

  if (kundeErr || !kundeRow) {
    const { data: fallback } = await supabaseAdmin
      .from("kunden")
      .select(
        "id, name, email, plz, ort, adresse, auth_user_id, portal_modus, freigabe_schwelle_eur"
      )
      .eq("id", id)
      .maybeSingle();
    if (!fallback) return null;
    kundeRow = {
      ...(fallback as NonNullable<typeof kundeRow>),
      eigentuemer_freigabe_schwelle_eur: null,
    };
  }

  if (!kundeRow) return null;

  const schwelleEur =
    kundeRow.eigentuemer_freigabe_schwelle_eur != null &&
    Number.isFinite(Number(kundeRow.eigentuemer_freigabe_schwelle_eur))
      ? Number(kundeRow.eigentuemer_freigabe_schwelle_eur)
      : EIGENTUEMER_DEFAULT_SCHWELLE_EUR;

  let objektIds: string[] = [];
  const { data: zuordnung, error: zuordErr } = await supabaseAdmin
    .from("eigentuemer_objekte")
    .select("kunde_objekt_id")
    .eq("kunde_id", id);

  if (zuordErr) {
    console.warn(
      "[eigentuemer-portal] eigentuemer_objekte (Migration?):",
      zuordErr.message
    );
    objektIds = [];
  } else {
    objektIds = (zuordnung ?? [])
      .map((r) =>
        String((r as { kunde_objekt_id: string }).kunde_objekt_id).trim()
      )
      .filter(Boolean);
  }

  const { einheiten, objektIdsFromEinheiten } =
    await loadEinheitenForEigentuemerPortal(id);
  for (const oid of objektIdsFromEinheiten) {
    if (!objektIds.includes(oid)) objektIds.push(oid);
  }

  // Soft-sync: fehlende Objekt-Links aus Einheiten nachziehen
  if (objektIdsFromEinheiten.length) {
    void import("@/lib/org/org-eigentuemer").then(
      ({ syncEigentuemerObjekteForPortalKunde }) =>
        syncEigentuemerObjekteForPortalKunde(id).catch(() => {})
    );
  }

  let objekte: EigentuemerPortalObjekt[] = [];
  if (objektIds.length) {
    const { data: objRows } = await supabaseAdmin
      .from("kunden_objekte")
      .select(
        "id, kunde_id, titel, strasse, hausnummer, plz, ort, einheiten_hinweis, notizen_intern, freigabe_schwelle_eur, created_at, cover_url"
      )
      .in("id", objektIds)
      .order("titel", { ascending: true });
    objekte = (objRows ?? []) as EigentuemerPortalObjekt[];
  }

  const mieterByObjektId = await loadMieterByObjektIds(objektIds);

  const hausverwaltungBrandPromise = loadMieterHvBrand({
    portalKundeId: id,
    portalKundeEmail: kundeRow.email,
    leads: [],
  });

  const objektById = new Map(
    objekte.map((o) => [
      o.id,
      {
        id: o.id,
        titel: o.titel,
        strasse: o.strasse,
        hausnummer: o.hausnummer,
        plz: o.plz,
        ort: o.ort,
      },
    ])
  );

  const empty = {
    kunde: {
      ...kundeRow,
      eigentuemer_freigabe_schwelle_eur: schwelleEur,
      freigabe_schwelle_eur: schwelleEur,
    },
    objekte,
    einheiten,
    objektIds,
    schwelleEur,
    leads: [] as LeadRow[],
    angebote: [] as PortalData["angebote"],
    auftraege: [] as PortalData["auftraege"],
    mieterFeedbackByLeadId: {} as PortalData["mieterFeedbackByLeadId"],
    mieterByObjektId,
  };

  if (objektIds.length === 0) {
    return {
      ...empty,
      hausverwaltungBrand: await hausverwaltungBrandPromise,
    };
  }

  const base = await getPortalDataForKunde(id, { mode: "list" });

  let leadsFromObjekte: LeadRow[] = [];
  const { data: extraLeads, error: leadErr } = await supabaseAdmin
    .from("leads")
    .select(
      "id, situation, bereiche, status, vorgang_phase, created_at, plz, strasse, hausnummer, zeitraum, kontakt_name, preis_min, preis_max, budget_ca, kontakt_nachricht, funnel_daten, kunde_objekt_id, anlass, kanal, auftraggeber_kunde_id, hv_meldung_status, org_freigabe_status, eigentuemer_freigabe_status, melde_tracking_token"
    )
    .in("kunde_objekt_id", objektIds)
    .is("geloescht_am", null)
    .order("created_at", { ascending: false });

  const mapLead = (raw: LeadRow, freigabe: string | null): LeadRow => ({
    ...raw,
    eigentuemer_freigabe_status: freigabe,
    objekt: resolvePortalObjekt({
      objektId: raw.kunde_objekt_id,
      objektById,
      kunde: kundeRow,
      leadPlz: raw.plz,
    }),
    dokumente: (raw as { dokumente?: LeadRow["dokumente"] }).dokumente ?? [],
  });

  if (leadErr) {
    console.warn(
      "[eigentuemer-portal] leads (freigabe-Spalte?):",
      leadErr.message
    );
    let fb = supabaseAdmin
      .from("leads")
      .select(
        "id, situation, bereiche, status, vorgang_phase, created_at, plz, strasse, hausnummer, zeitraum, kontakt_name, preis_min, preis_max, budget_ca, kontakt_nachricht, funnel_daten, kunde_objekt_id, anlass, kanal, auftraggeber_kunde_id, hv_meldung_status, org_freigabe_status, melde_tracking_token"
      )
      .in("kunde_objekt_id", objektIds)
      .order("created_at", { ascending: false });
    if (!/geloescht_am/i.test(leadErr.message)) {
      fb = fb.is("geloescht_am", null);
    }
    const { data: fallbackLeads } = await fb;
    leadsFromObjekte = (fallbackLeads ?? []).map((l) =>
      mapLead(l as LeadRow, null)
    );
  } else {
    leadsFromObjekte = (extraLeads ?? []).map((l) => {
      const raw = l as LeadRow;
      return mapLead(
        raw,
        raw.eigentuemer_freigabe_status != null
          ? String(raw.eigentuemer_freigabe_status)
          : null
      );
    });
  }

  const byId = new Map<string, LeadRow>();
  if (base) {
    for (const l of filterLeadsByEigentuemerObjekte(
      base.leads as LeadRow[],
      objektIds
    )) {
      byId.set(String(l.id), l);
    }
  }
  for (const l of leadsFromObjekte) {
    byId.set(String(l.id), l);
  }
  const leads = Array.from(byId.values()).sort((a, b) => {
    const ta = new Date(String(a.created_at ?? 0)).getTime();
    const tb = new Date(String(b.created_at ?? 0)).getTime();
    return tb - ta;
  });

  const leadIdSet = new Set(leads.map((l) => String(l.id)));
  const angebote = ((base?.angebote ?? []) as PortalData["angebote"]).filter(
    (a) => {
      const lid =
        (a as { lead_id?: string | null }).lead_id != null
          ? String((a as { lead_id?: string | null }).lead_id)
          : "";
      return lid && leadIdSet.has(lid);
    }
  );
  const auftraege = ((base?.auftraege ?? []) as PortalData["auftraege"]).filter(
    (a) => {
      const lid =
        (a as { lead_id?: string | null }).lead_id != null
          ? String((a as { lead_id?: string | null }).lead_id)
          : "";
      return lid && leadIdSet.has(lid);
    }
  );

  const coveredAng = new Set(
    angebote.map((a) => String((a as { lead_id?: string }).lead_id ?? ""))
  );
  const missingLeadIds = leads
    .map((l) => String(l.id))
    .filter((lid) => !coveredAng.has(lid));

  if (missingLeadIds.length) {
    const { data: angExtra } = await supabaseAdmin
      .from("angebote")
      .select(
        "id, angebotsnr, lead_id, kunde_objekt_id, status_einfach, gesamt_fix, gesamt_min, gesamt_max, gueltig_bis, leistungsumfang, notizen, positionen, created_at, gesendet_am, pdf_url"
      )
      .in("lead_id", missingLeadIds);
    for (const a of angExtra ?? []) {
      const lid = String((a as { lead_id: string }).lead_id);
      const lead = byId.get(lid);
      const summe =
        (a as { gesamt_fix?: number | null }).gesamt_fix ??
        (a as { gesamt_preis?: number | null }).gesamt_preis;
      angebote.push({
        ...(a as unknown as (typeof angebote)[number]),
        titel: (a as { angebotsnr?: string | null }).angebotsnr ?? "Angebot",
        objekt: lead?.objekt ?? null,
        linkedLead: lead ?? null,
        gesamtBrutto: Number(summe) || 0,
        positionenDisplay: [],
        dokumente: [],
        leistungen: [],
        hinweise: undefined,
      } as (typeof angebote)[number]);
    }

    const coveredAuf = new Set(
      auftraege.map((a) => String((a as { lead_id?: string }).lead_id ?? ""))
    );
    const missingAuf = missingLeadIds.filter((lid) => !coveredAuf.has(lid));
    if (missingAuf.length) {
      const { data: aufExtra } = await supabaseAdmin
        .from("auftraege")
        .select(
          "id, titel, status, fortschritt, start_datum, end_datum, created_at, lead_id, angebot_id"
        )
        .in("lead_id", missingAuf);
      for (const a of aufExtra ?? []) {
        const lid = String((a as { lead_id: string }).lead_id);
        const lead = byId.get(lid);
        auftraege.push({
          ...(a as unknown as (typeof auftraege)[number]),
          titel:
            String((a as { titel?: string | null }).titel ?? "").trim() ||
            "Auftrag",
          objekt: lead?.objekt ?? null,
          linkedLead: lead ?? null,
          dokumente: [],
          positionen: [],
        } as (typeof auftraege)[number]);
      }
    }
  }

  return {
    kunde: {
      ...(base?.kunde ?? kundeRow),
      ...kundeRow,
      eigentuemer_freigabe_schwelle_eur: schwelleEur,
      freigabe_schwelle_eur: schwelleEur,
    },
    objekte,
    einheiten,
    objektIds,
    schwelleEur,
    leads,
    angebote,
    auftraege,
    mieterFeedbackByLeadId: base?.mieterFeedbackByLeadId ?? {},
    mieterByObjektId,
    hausverwaltungBrand: await hausverwaltungBrandPromise,
  };
}

/** Betrag für Schwellen-Check: Angebot brutto, sonst Lead-Preis. */
export function resolveEigentuemerVorgangBetrag(input: {
  angebotBrutto?: number | null;
  preisMax?: number | null;
  budgetCa?: number | null;
}): number | null {
  const candidates = [input.angebotBrutto, input.preisMax, input.budgetCa]
    .map((n) => (n == null ? NaN : Number(n)))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (!candidates.length) return null;
  return Math.max(...candidates);
}
