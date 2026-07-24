import type { OrganisationKunde } from "@/lib/org/types";
import { supabaseAdmin } from "@/lib/supabase";

const KUNDE_SELECT_BASE =
  "id, name, email, portal_modus, org_kennung, org_anzeigename, org_logo_url, freigabe_modus, freigabe_schwelle_eur, notfall_direkt";

const KUNDE_SELECT_BASE_HERO = `${KUNDE_SELECT_BASE}, org_hero_url`;

/** Vor A2-Migration (ohne Palette-Felder). */
const KUNDE_SELECT_WL_LEGACY =
  `${KUNDE_SELECT_BASE}, org_primary_color, mieter_kontakt_telefon, mieter_kontakt_email, mieter_kontakt_hinweis, av_akzeptiert_am, av_version, av_akzeptiert_von, av_text_snapshot, wl_ansprache_am, impressum_url, datenschutz_url`;

const KUNDE_SELECT_WL_LEGACY_HERO =
  `${KUNDE_SELECT_BASE_HERO}, org_primary_color, mieter_kontakt_telefon, mieter_kontakt_email, mieter_kontakt_hinweis, av_akzeptiert_am, av_version, av_akzeptiert_von, av_text_snapshot, wl_ansprache_am, impressum_url, datenschutz_url`;

const KUNDE_SELECT_WL =
  `${KUNDE_SELECT_BASE}, org_primary_color, org_primary_color_dk, org_primary_color_soft, org_logo_kuerzel, org_sub, org_telefon, org_strasse, org_ort, mieter_kontakt_telefon, mieter_kontakt_email, mieter_kontakt_hinweis, av_akzeptiert_am, av_version, av_akzeptiert_von, av_text_snapshot, wl_ansprache_am, impressum_url, datenschutz_url`;

const KUNDE_SELECT_WL_HERO =
  `${KUNDE_SELECT_BASE_HERO}, org_primary_color, org_primary_color_dk, org_primary_color_soft, org_logo_kuerzel, org_sub, org_telefon, org_strasse, org_ort, mieter_kontakt_telefon, mieter_kontakt_email, mieter_kontakt_hinweis, av_akzeptiert_am, av_version, av_akzeptiert_von, av_text_snapshot, wl_ansprache_am, impressum_url, datenschutz_url`;

const KUNDE_SELECT_KLEINREPARATUR = `${KUNDE_SELECT_WL_HERO}, kleinreparatur_aktiv, kleinreparatur_schwelle_eur`;
const KUNDE_SELECT_KLEINREPARATUR_NO_HERO = `${KUNDE_SELECT_WL}, kleinreparatur_aktiv, kleinreparatur_schwelle_eur`;
const KUNDE_SELECT_KLEINREPARATUR_LEGACY = `${KUNDE_SELECT_WL_LEGACY_HERO}, kleinreparatur_aktiv, kleinreparatur_schwelle_eur`;
const KUNDE_SELECT_KLEINREPARATUR_LEGACY_NO_HERO = `${KUNDE_SELECT_WL_LEGACY}, kleinreparatur_aktiv, kleinreparatur_schwelle_eur`;

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
  const attempts = [
    KUNDE_SELECT_KLEINREPARATUR,
    KUNDE_SELECT_KLEINREPARATUR_NO_HERO,
    KUNDE_SELECT_KLEINREPARATUR_LEGACY,
    KUNDE_SELECT_KLEINREPARATUR_LEGACY_NO_HERO,
    KUNDE_SELECT_WL_HERO,
    KUNDE_SELECT_WL,
    KUNDE_SELECT_WL_LEGACY_HERO,
    KUNDE_SELECT_WL_LEGACY,
    KUNDE_SELECT_BASE_HERO,
    KUNDE_SELECT_BASE,
  ];

  for (const select of attempts) {
    const { data, error } = await supabaseAdmin
      .from("kunden")
      .select(select)
      .eq("id", kundeId)
      .maybeSingle();

    if (error) {
      console.warn("[org-portal] kunde select:", error.message);
      continue;
    }
    if (!data) return null;
    const row = data as unknown as Record<string, unknown>;
    if (row.portal_modus !== "organisation") return null;
    return withKleinreparaturDefaults(row);
  }

  return null;
}
