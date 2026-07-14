import type { OrganisationKunde } from "@/lib/org/types";
import { supabaseAdmin } from "@/lib/supabase";

const KUNDE_SELECT_BASE =
  "id, name, email, portal_modus, org_kennung, org_anzeigename, org_logo_url, freigabe_modus, freigabe_schwelle_eur, notfall_direkt";

const KUNDE_SELECT_WL =
  `${KUNDE_SELECT_BASE}, org_primary_color, mieter_kontakt_telefon, mieter_kontakt_email, mieter_kontakt_hinweis, av_akzeptiert_am, av_version, av_akzeptiert_von, av_text_snapshot, wl_ansprache_am, impressum_url, datenschutz_url`;

const KUNDE_SELECT_KLEINREPARATUR = `${KUNDE_SELECT_WL}, kleinreparatur_aktiv, kleinreparatur_schwelle_eur`;

function withKleinreparaturDefaults(
  row: Record<string, unknown>
): OrganisationKunde {
  return {
    ...(row as OrganisationKunde),
    kleinreparatur_aktiv: Boolean(row.kleinreparatur_aktiv ?? false),
    kleinreparatur_schwelle_eur: Number(row.kleinreparatur_schwelle_eur ?? 200),
  };
}

/** Lädt Auftraggeber-Stammdaten; fällt bei fehlender HV-Migration auf Defaults zurück. */
export async function loadOrganisationKunde(
  kundeId: string
): Promise<OrganisationKunde | null> {
  const { data: full, error: fullErr } = await supabaseAdmin
    .from("kunden")
    .select(KUNDE_SELECT_KLEINREPARATUR)
    .eq("id", kundeId)
    .maybeSingle();

  if (!fullErr && full) {
    const row = full as Record<string, unknown>;
    if (row.portal_modus !== "organisation") return null;
    return withKleinreparaturDefaults(row);
  }

  if (fullErr) {
    console.warn("[org-portal] kunde (voll):", fullErr.message);
    const { data: wlOnly, error: wlErr } = await supabaseAdmin
      .from("kunden")
      .select(KUNDE_SELECT_WL)
      .eq("id", kundeId)
      .maybeSingle();

    if (!wlErr && wlOnly) {
      const row = wlOnly as Record<string, unknown>;
      if (row.portal_modus !== "organisation") return null;
      return withKleinreparaturDefaults(row);
    }
  }

  const { data: base, error: baseErr } = await supabaseAdmin
    .from("kunden")
    .select(KUNDE_SELECT_BASE)
    .eq("id", kundeId)
    .maybeSingle();

  if (baseErr) {
    console.error("[org-portal] kunde (basis):", baseErr.message);
    return null;
  }
  if (!base || (base as { portal_modus?: string }).portal_modus !== "organisation") {
    return null;
  }

  return withKleinreparaturDefaults(base as Record<string, unknown>);
}
