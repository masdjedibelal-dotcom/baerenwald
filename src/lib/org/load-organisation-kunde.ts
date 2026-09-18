import { ensureOrgKennung } from "@/lib/org/ensure-org-kennung";
import { orgMeldeLegalUrlsReady } from "@/lib/org/melde-legal-urls";
import { normalizeAkutFallIds } from "@/lib/org/sofortmassnahme-faelle";
import type { OrganisationKunde } from "@/lib/org/types";
import { supabaseAdmin } from "@/lib/supabase";

const KUNDE_SELECT_BASE =
  "id, name, email, portal_modus, org_kennung, org_anzeigename, org_logo_url, freigabe_modus, freigabe_schwelle_eur, notfall_direkt";

const KUNDE_SELECT_BASE_AKUT = `${KUNDE_SELECT_BASE}, akut_fall_ids`;

const KUNDE_SELECT_BASE_HERO = `${KUNDE_SELECT_BASE}, org_hero_url`;
const KUNDE_SELECT_BASE_HERO_AKUT = `${KUNDE_SELECT_BASE_AKUT}, org_hero_url`;

/** Vor A2-Migration (ohne Palette-Felder). */
const KUNDE_SELECT_WL_LEGACY =
  `${KUNDE_SELECT_BASE}, org_primary_color, mieter_kontakt_telefon, mieter_kontakt_email, mieter_kontakt_hinweis, av_akzeptiert_am, av_version, av_akzeptiert_von, av_text_snapshot, wl_ansprache_am, impressum_url, datenschutz_url`;

const KUNDE_SELECT_WL_LEGACY_HERO =
  `${KUNDE_SELECT_BASE_HERO}, org_primary_color, mieter_kontakt_telefon, mieter_kontakt_email, mieter_kontakt_hinweis, av_akzeptiert_am, av_version, av_akzeptiert_von, av_text_snapshot, wl_ansprache_am, impressum_url, datenschutz_url`;

const KUNDE_SELECT_WL =
  `${KUNDE_SELECT_BASE}, org_primary_color, org_primary_color_dk, org_primary_color_soft, org_logo_kuerzel, org_sub, org_telefon, org_strasse, org_hausnummer, org_plz, org_ort, strasse, hausnummer, plz, ort, mieter_kontakt_telefon, mieter_kontakt_email, mieter_kontakt_hinweis, av_akzeptiert_am, av_version, av_akzeptiert_von, av_text_snapshot, wl_ansprache_am, impressum_url, datenschutz_url`;

const KUNDE_SELECT_WL_HERO =
  `${KUNDE_SELECT_BASE_HERO}, org_primary_color, org_primary_color_dk, org_primary_color_soft, org_logo_kuerzel, org_sub, org_telefon, org_strasse, org_hausnummer, org_plz, org_ort, strasse, hausnummer, plz, ort, mieter_kontakt_telefon, mieter_kontakt_email, mieter_kontakt_hinweis, av_akzeptiert_am, av_version, av_akzeptiert_von, av_text_snapshot, wl_ansprache_am, impressum_url, datenschutz_url`;

/** Mit akut_fall_ids (nach Migration). */
const KUNDE_SELECT_WL_AKUT =
  `${KUNDE_SELECT_BASE_AKUT}, org_primary_color, org_primary_color_dk, org_primary_color_soft, org_logo_kuerzel, org_sub, org_telefon, org_strasse, org_hausnummer, org_plz, org_ort, strasse, hausnummer, plz, ort, mieter_kontakt_telefon, mieter_kontakt_email, mieter_kontakt_hinweis, av_akzeptiert_am, av_version, av_akzeptiert_von, av_text_snapshot, wl_ansprache_am, impressum_url, datenschutz_url`;

const KUNDE_SELECT_WL_HERO_AKUT =
  `${KUNDE_SELECT_BASE_HERO_AKUT}, org_primary_color, org_primary_color_dk, org_primary_color_soft, org_logo_kuerzel, org_sub, org_telefon, org_strasse, org_hausnummer, org_plz, org_ort, strasse, hausnummer, plz, ort, mieter_kontakt_telefon, mieter_kontakt_email, mieter_kontakt_hinweis, av_akzeptiert_am, av_version, av_akzeptiert_von, av_text_snapshot, wl_ansprache_am, impressum_url, datenschutz_url`;

/** Ohne org_hausnummer/org_plz (vor Split-Migration). */
const KUNDE_SELECT_WL_NO_SPLIT =
  `${KUNDE_SELECT_BASE}, org_primary_color, org_primary_color_dk, org_primary_color_soft, org_logo_kuerzel, org_sub, org_telefon, org_strasse, org_ort, strasse, hausnummer, plz, ort, mieter_kontakt_telefon, mieter_kontakt_email, mieter_kontakt_hinweis, av_akzeptiert_am, av_version, av_akzeptiert_von, av_text_snapshot, wl_ansprache_am, impressum_url, datenschutz_url`;

const KUNDE_SELECT_WL_HERO_NO_SPLIT =
  `${KUNDE_SELECT_BASE_HERO}, org_primary_color, org_primary_color_dk, org_primary_color_soft, org_logo_kuerzel, org_sub, org_telefon, org_strasse, org_ort, strasse, hausnummer, plz, ort, mieter_kontakt_telefon, mieter_kontakt_email, mieter_kontakt_hinweis, av_akzeptiert_am, av_version, av_akzeptiert_von, av_text_snapshot, wl_ansprache_am, impressum_url, datenschutz_url`;

const KUNDE_SELECT_KLEINREPARATUR = `${KUNDE_SELECT_WL_HERO}, kleinreparatur_aktiv`;
const KUNDE_SELECT_KLEINREPARATUR_NO_HERO = `${KUNDE_SELECT_WL}, kleinreparatur_aktiv`;
const KUNDE_SELECT_KLEINREPARATUR_NO_SPLIT = `${KUNDE_SELECT_WL_HERO_NO_SPLIT}, kleinreparatur_aktiv`;
const KUNDE_SELECT_KLEINREPARATUR_NO_SPLIT_NO_HERO = `${KUNDE_SELECT_WL_NO_SPLIT}, kleinreparatur_aktiv`;
const KUNDE_SELECT_KLEINREPARATUR_LEGACY = `${KUNDE_SELECT_WL_LEGACY_HERO}, kleinreparatur_aktiv`;
const KUNDE_SELECT_KLEINREPARATUR_LEGACY_NO_HERO = `${KUNDE_SELECT_WL_LEGACY}, kleinreparatur_aktiv`;

const KUNDE_SELECT_HM =
  `${KUNDE_SELECT_KLEINREPARATUR}, hm_auto_zuweisen`;
const KUNDE_SELECT_HM_NO_HERO =
  `${KUNDE_SELECT_KLEINREPARATUR_NO_HERO}, hm_auto_zuweisen`;

const KUNDE_SELECT_HM_AKUT =
  `${KUNDE_SELECT_WL_HERO_AKUT}, kleinreparatur_aktiv, hm_auto_zuweisen`;
const KUNDE_SELECT_HM_AKUT_NO_HERO =
  `${KUNDE_SELECT_WL_AKUT}, kleinreparatur_aktiv, hm_auto_zuweisen`;

function withKleinreparaturDefaults(
  row: Record<string, unknown>
): OrganisationKunde {
  return {
    ...(row as OrganisationKunde),
    kleinreparatur_aktiv: Boolean(row.kleinreparatur_aktiv ?? false),
    hm_auto_zuweisen: Boolean(row.hm_auto_zuweisen ?? false),
    akut_fall_ids: normalizeAkutFallIds(row.akut_fall_ids),
  };
}

/** Erfolgreicher Select aus vorherigem Request — vermeidet Fallback-Kette. */
let cachedKundeSelect: string | null = null;

/** Lädt Auftraggeber-Stammdaten; fällt bei fehlender HV-Migration auf Defaults zurück. */
export async function loadOrganisationKunde(
  kundeId: string
): Promise<OrganisationKunde | null> {
  const attempts = [
    KUNDE_SELECT_HM_AKUT,
    KUNDE_SELECT_HM_AKUT_NO_HERO,
    KUNDE_SELECT_HM,
    KUNDE_SELECT_HM_NO_HERO,
    KUNDE_SELECT_KLEINREPARATUR,
    KUNDE_SELECT_KLEINREPARATUR_NO_HERO,
    KUNDE_SELECT_KLEINREPARATUR_NO_SPLIT,
    KUNDE_SELECT_KLEINREPARATUR_NO_SPLIT_NO_HERO,
    KUNDE_SELECT_KLEINREPARATUR_LEGACY,
    KUNDE_SELECT_KLEINREPARATUR_LEGACY_NO_HERO,
    KUNDE_SELECT_WL_HERO,
    KUNDE_SELECT_WL,
    KUNDE_SELECT_WL_HERO_NO_SPLIT,
    KUNDE_SELECT_WL_NO_SPLIT,
    KUNDE_SELECT_WL_LEGACY_HERO,
    KUNDE_SELECT_WL_LEGACY,
    KUNDE_SELECT_BASE_HERO_AKUT,
    KUNDE_SELECT_BASE_AKUT,
    KUNDE_SELECT_BASE_HERO,
    KUNDE_SELECT_BASE,
  ];

  const ordered = cachedKundeSelect
    ? [cachedKundeSelect, ...attempts.filter((s) => s !== cachedKundeSelect)]
    : attempts;

  for (const select of ordered) {
    const { data, error } = await supabaseAdmin
      .from("kunden")
      .select(select)
      .eq("id", kundeId)
      .maybeSingle();

    if (error) {
      if (cachedKundeSelect === select) cachedKundeSelect = null;
      console.warn("[org-portal] kunde select:", error.message);
      continue;
    }
    if (!data) return null;
    const row = data as unknown as Record<string, unknown>;
    if (row.portal_modus !== "organisation") return null;
    cachedKundeSelect = select;
    let kunde = withKleinreparaturDefaults(row);
    // Legal-Links gesetzt, Kennung fehlt → still vergeben (Melde-Link/Aushang)
    if (
      orgMeldeLegalUrlsReady(kunde) &&
      !kunde.org_kennung?.trim()
    ) {
      const kennung = await ensureOrgKennung(kunde);
      if (kennung) kunde = { ...kunde, org_kennung: kennung };
    }
    return kunde;
  }

  return null;
}
