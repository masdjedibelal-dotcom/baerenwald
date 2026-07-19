import { getPortalDataForKunde } from "@/lib/portal/get-portal-data";
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
>;

type PortalData = NonNullable<Awaited<ReturnType<typeof getPortalDataForKunde>>>;

type LeadRow = PortalData["leads"][number] & {
  kunde_objekt_id?: string | null;
  eigentuemer_freigabe_status?: string | null;
  preis_max?: number | null;
  budget_ca?: number | null;
};

/**
 * D8: Eigentümer-Portal-Daten.
 * Sichtbarkeit: nur Objekte aus `eigentuemer_objekte` + zugehörige Vorgänge.
 * Ohne Migration: leere Zuordnung (kein Datenleck).
 */
export async function getEigentuemerPortalData(kundeId: string): Promise<{
  kunde: PortalData["kunde"] & {
    eigentuemer_freigabe_schwelle_eur: number;
  };
  objekte: EigentuemerPortalObjekt[];
  objektIds: string[];
  schwelleEur: number;
  leads: LeadRow[];
  angebote: PortalData["angebote"];
  auftraege: PortalData["auftraege"];
  mieterFeedbackByLeadId: PortalData["mieterFeedbackByLeadId"];
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

  let objekte: EigentuemerPortalObjekt[] = [];
  if (objektIds.length) {
    const { data: objRows } = await supabaseAdmin
      .from("kunden_objekte")
      .select(
        "id, kunde_id, titel, strasse, hausnummer, plz, ort, einheiten_hinweis, notizen_intern, freigabe_schwelle_eur, created_at"
      )
      .in("id", objektIds)
      .order("titel", { ascending: true });
    objekte = (objRows ?? []) as EigentuemerPortalObjekt[];
  }

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
    objektIds,
    schwelleEur,
    leads: [] as LeadRow[],
    angebote: [] as PortalData["angebote"],
    auftraege: [] as PortalData["auftraege"],
    mieterFeedbackByLeadId: {} as PortalData["mieterFeedbackByLeadId"],
  };

  if (objektIds.length === 0) {
    return empty;
  }

  const base = await getPortalDataForKunde(id);

  let leadsFromObjekte: LeadRow[] = [];
  const { data: extraLeads, error: leadErr } = await supabaseAdmin
    .from("leads")
    .select(
      "id, situation, bereiche, status, vorgang_phase, created_at, plz, strasse, hausnummer, zeitraum, kontakt_name, preis_min, preis_max, budget_ca, kontakt_nachricht, funnel_daten, kunde_objekt_id, anlass, kanal, auftraggeber_kunde_id, hv_meldung_status, org_freigabe_status, eigentuemer_freigabe_status, melde_tracking_token"
    )
    .in("kunde_objekt_id", objektIds)
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
    const { data: fallbackLeads } = await supabaseAdmin
      .from("leads")
      .select(
        "id, situation, bereiche, status, vorgang_phase, created_at, plz, strasse, hausnummer, zeitraum, kontakt_name, preis_min, preis_max, budget_ca, kontakt_nachricht, funnel_daten, kunde_objekt_id, anlass, kanal, auftraggeber_kunde_id, hv_meldung_status, org_freigabe_status, melde_tracking_token"
      )
      .in("kunde_objekt_id", objektIds)
      .order("created_at", { ascending: false });
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
        "id, angebotsnr, lead_id, kunde_objekt_id, status_einfach, gesamt_preis, gesamt_min, gesamt_max, gueltig_bis, leistungsumfang, notizen, positionen, created_at, gesendet_am, pdf_url"
      )
      .in("lead_id", missingLeadIds);
    for (const a of angExtra ?? []) {
      const lid = String((a as { lead_id: string }).lead_id);
      const lead = byId.get(lid);
      angebote.push({
        ...(a as unknown as (typeof angebote)[number]),
        titel: (a as { angebotsnr?: string | null }).angebotsnr ?? "Angebot",
        objekt: lead?.objekt ?? null,
        linkedLead: lead ?? null,
        gesamtBrutto:
          Number((a as { gesamt_preis?: number | null }).gesamt_preis) || 0,
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
    objektIds,
    schwelleEur,
    leads,
    angebote,
    auftraege,
    mieterFeedbackByLeadId: base?.mieterFeedbackByLeadId ?? {},
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
