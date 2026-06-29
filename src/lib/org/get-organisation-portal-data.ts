import { getPortalDataForKunde } from "@/lib/portal/get-portal-data";
import { resolvePortalObjekt } from "@/lib/portal/portal-objekt";
import { loadOrganisationKunde } from "@/lib/org/load-organisation-kunde";
import type {
  OrganisationLead,
  OrganisationObjekt,
} from "@/lib/org/types";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

const EINGANG_SELECT_FULL =
  "id, situation, bereiche, status, created_at, plz, strasse, hausnummer, zeitraum, kontakt_name, preis_min, preis_max, preis_unsicher, kontakt_nachricht, funnel_daten, kunde_objekt_id, anlass, erfassung_von, melder_name, melder_einheit, melder_telefon, melder_email, einladung_token, einladung_status, org_freigabe_status, hv_meldung_status, service_modus, auftraggeber_kunde_id, kunde_id";

const EINGANG_SELECT_BASE =
  "id, situation, bereiche, status, created_at, plz, strasse, hausnummer, zeitraum, kontakt_name, preis_min, preis_max, kontakt_nachricht, funnel_daten, kunde_objekt_id, anlass, erfassung_von, melder_name, melder_einheit, melder_telefon, melder_email, einladung_token, einladung_status, org_freigabe_status, service_modus, auftraggeber_kunde_id, kunde_id";

export async function getOrganisationPortalData(kundeId: string) {
  if (!isSupabaseConfigured()) return null;

  const base = await getPortalDataForKunde(kundeId);
  if (!base) return null;

  const kunde = await loadOrganisationKunde(kundeId);
  if (!kunde) return null;

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

  const { data: eingangRows, error: eingangErr } = await supabaseAdmin
    .from("leads")
    .select(EINGANG_SELECT_FULL)
    .eq("auftraggeber_kunde_id", kundeId)
    .eq("anlass", "meldung")
    .order("created_at", { ascending: false });

  let eingangSource: Record<string, unknown>[] | null = (eingangRows ??
    null) as Record<string, unknown>[] | null;
  if (eingangErr) {
    console.warn("[org-portal] eingang (voll):", eingangErr.message);
    const fallback = await supabaseAdmin
      .from("leads")
      .select(EINGANG_SELECT_BASE)
      .eq("auftraggeber_kunde_id", kundeId)
      .eq("anlass", "meldung")
      .order("created_at", { ascending: false });
    if (fallback.error) {
      console.error("[org-portal] eingang (basis):", fallback.error.message);
      eingangSource = [];
    } else {
      eingangSource = (fallback.data ?? []).map((row) => ({
        ...(row as Record<string, unknown>),
        preis_unsicher: false,
        hv_meldung_status: null,
      }));
    }
  }

  const eingang = (eingangSource ?? []).map((row) => {
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
