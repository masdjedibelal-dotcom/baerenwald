import { getPortalDataForKunde } from "@/lib/portal/get-portal-data";
import { resolvePortalObjekt } from "@/lib/portal/portal-objekt";
import type {
  OrganisationKunde,
  OrganisationLead,
  OrganisationObjekt,
} from "@/lib/org/types";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export async function getOrganisationPortalData(kundeId: string) {
  if (!isSupabaseConfigured()) return null;

  const base = await getPortalDataForKunde(kundeId);
  if (!base) return null;

  const { data: kundeRow } = await supabaseAdmin
    .from("kunden")
    .select(
      "id, name, email, portal_modus, org_kennung, org_anzeigename, org_logo_url, freigabe_modus, freigabe_schwelle_eur, notfall_direkt, kleinreparatur_aktiv, kleinreparatur_schwelle_eur"
    )
    .eq("id", kundeId)
    .maybeSingle();

  if (!kundeRow || kundeRow.portal_modus !== "organisation") return null;

  const kunde = kundeRow as OrganisationKunde;

  const { data: objekteRows } = await supabaseAdmin
    .from("kunden_objekte")
    .select(
      "id, kunde_id, titel, strasse, hausnummer, plz, ort, melde_slug, melde_aktiv, einheiten_hinweis, notizen_intern, created_at"
    )
    .eq("kunde_id", kundeId)
    .order("titel", { ascending: true });

  const objekte = (objekteRows ?? []) as OrganisationObjekt[];
  const objektById = new Map(objekte.map((o) => [o.id, o]));

  const resolveObj = (objektId: string | null | undefined) => {
    if (!objektId) return null;
    const o = objektById.get(objektId);
    if (!o) return null;
    return resolvePortalObjekt({
      objektId,
      objektById: objektById as Map<
        string,
        {
          id: string;
          titel: string | null;
          strasse: string | null;
          hausnummer: string | null;
          plz: string | null;
          ort: string | null;
        }
      >,
      kunde: { name: kunde.name, adresse: null, plz: null, ort: null },
      leadPlz: o.plz,
    });
  };

  const { data: eingangRows } = await supabaseAdmin
    .from("leads")
    .select(
      "id, situation, bereiche, status, created_at, plz, strasse, hausnummer, zeitraum, kontakt_name, preis_min, preis_max, preis_unsicher, kontakt_nachricht, funnel_daten, kunde_objekt_id, anlass, erfassung_von, melder_name, melder_einheit, melder_telefon, melder_email, einladung_token, einladung_status, org_freigabe_status, hv_meldung_status, service_modus, auftraggeber_kunde_id, kunde_id"
    )
    .eq("auftraggeber_kunde_id", kundeId)
    .eq("anlass", "meldung")
    .order("created_at", { ascending: false });

  const eingang = (eingangRows ?? []).map((row) => {
    const r = row as { kunde_objekt_id?: string | null };
    return {
      ...(row as object),
      objekt: resolveObj(r.kunde_objekt_id),
    };
  }) as OrganisationLead[];

  const orgLeads: OrganisationLead[] = base.leads.map((l) => ({
    ...(l as OrganisationLead),
    objekt: (l as { objekt?: OrganisationLead["objekt"] }).objekt ?? null,
  }));

  return {
    kunde,
    objekte,
    eingang,
    leads: orgLeads,
    angebote: base.angebote,
    auftraege: base.auftraege,
  };
}
