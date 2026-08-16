/**
 * Hausmeister-Portal-Daten — Scope über hausmeister_objekte.
 */
import { getPortalDataForKunde } from "@/lib/portal/get-portal-data";
import {
  loadMieterHvBrand,
  type MieterHvBrand,
} from "@/lib/portal/load-mieter-hv-brand";
import { listObjektIdsForHausmeisterPortalKunde } from "@/lib/org/org-hausmeister";
import { resolvePortalObjekt } from "@/lib/portal/portal-objekt";
import { filterLeadsByEigentuemerObjekte } from "@/lib/portal2/eigentuemer";
import type { OrganisationObjekt } from "@/lib/org/types";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export type HausmeisterPortalObjekt = Pick<
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

type PortalData = NonNullable<Awaited<ReturnType<typeof getPortalDataForKunde>>>;

type LeadRow = PortalData["leads"][number] & {
  kunde_objekt_id?: string | null;
  hv_meldung_status?: string | null;
};

export async function getHausmeisterPortalData(kundeId: string): Promise<{
  kunde: PortalData["kunde"];
  objekte: HausmeisterPortalObjekt[];
  objektIds: string[];
  leads: LeadRow[];
  angebote: PortalData["angebote"];
  auftraege: PortalData["auftraege"];
  hausverwaltungBrand: MieterHvBrand | null;
  orgKundeId: string | null;
} | null> {
  if (!isSupabaseConfigured()) return null;
  const id = kundeId.trim();
  if (!id) return null;

  const { data: kundeRow } = await supabaseAdmin
    .from("kunden")
    .select("id, name, email, portal_modus, auth_user_id")
    .eq("id", id)
    .maybeSingle();
  if (!kundeRow || String(kundeRow.portal_modus) !== "hausmeister") {
    return null;
  }

  const objektIds = await listObjektIdsForHausmeisterPortalKunde(id);

  let orgKundeId: string | null = null;
  {
    const { data: hm } = await supabaseAdmin
      .from("org_hausmeister")
      .select("org_kunde_id")
      .eq("portal_kunde_id", id)
      .limit(1)
      .maybeSingle();
    orgKundeId = hm?.org_kunde_id ? String(hm.org_kunde_id) : null;
  }

  let objekte: HausmeisterPortalObjekt[] = [];
  if (objektIds.length) {
    const { data: objRows } = await supabaseAdmin
      .from("kunden_objekte")
      .select(
        "id, kunde_id, titel, strasse, hausnummer, plz, ort, einheiten_hinweis, notizen_intern, freigabe_schwelle_eur, created_at, cover_url"
      )
      .in("id", objektIds)
      .order("titel", { ascending: true });
    objekte = (objRows ?? []) as HausmeisterPortalObjekt[];
  }

  const hausverwaltungBrand = await loadMieterHvBrand({
    portalKundeId: id,
    portalKundeEmail: kundeRow.email,
    leads: [],
  });

  if (!objektIds.length) {
    return {
      kunde: kundeRow as PortalData["kunde"],
      objekte,
      objektIds,
      leads: [],
      angebote: [],
      auftraege: [],
      hausverwaltungBrand,
      orgKundeId,
    };
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

  const { data: leadRows } = await supabaseAdmin
    .from("leads")
    .select(
      "id, situation, bereiche, status, vorgang_phase, created_at, plz, strasse, hausnummer, zeitraum, kontakt_name, preis_min, preis_max, budget_ca, kontakt_nachricht, funnel_daten, kunde_objekt_id, anlass, kanal, auftraggeber_kunde_id, hv_meldung_status, org_freigabe_status, melde_tracking_token"
    )
    .in("kunde_objekt_id", objektIds)
    .is("geloescht_am", null)
    .order("created_at", { ascending: false });

  const leads: LeadRow[] = (leadRows ?? []).map((l) => {
    const raw = l as LeadRow;
    return {
      ...raw,
      objekt: resolvePortalObjekt({
        objektId: raw.kunde_objekt_id,
        objektById,
        kunde: kundeRow,
        leadPlz: raw.plz,
      }),
      dokumente: [],
    };
  });

  const base = await getPortalDataForKunde(id, { mode: "list" });
  const byId = new Map<string, LeadRow>();
  if (base) {
    for (const l of filterLeadsByEigentuemerObjekte(
      base.leads as LeadRow[],
      objektIds
    )) {
      byId.set(String(l.id), l);
    }
  }
  for (const l of leads) byId.set(String(l.id), l);
  const merged = Array.from(byId.values()).sort((a, b) => {
    const ta = new Date(String(a.created_at ?? 0)).getTime();
    const tb = new Date(String(b.created_at ?? 0)).getTime();
    return tb - ta;
  });

  const leadIdSet = new Set(merged.map((l) => String(l.id)));
  const angebote = ((base?.angebote ?? []) as PortalData["angebote"]).filter(
    (a) => {
      const lid = String((a as { lead_id?: string }).lead_id ?? "");
      return lid && leadIdSet.has(lid);
    }
  );
  const auftraege = ((base?.auftraege ?? []) as PortalData["auftraege"]).filter(
    (a) => {
      const lid = String((a as { lead_id?: string }).lead_id ?? "");
      return lid && leadIdSet.has(lid);
    }
  );

  return {
    kunde: { ...(base?.kunde ?? {}), ...kundeRow } as PortalData["kunde"],
    objekte,
    objektIds,
    leads: merged,
    angebote,
    auftraege,
    hausverwaltungBrand,
    orgKundeId,
  };
}
