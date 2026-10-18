import { logDbError } from '@/lib/errors/log-db-error'
import { ensureOrgKennung } from "@/lib/org/ensure-org-kennung";
import { orgMeldeLegalUrlsReady } from "@/lib/org/melde-legal-urls";
import { normalizeAkutFallIds } from "@/lib/org/sofortmassnahme-faelle";
import type { OrganisationKunde } from "@/lib/org/types";
import { supabaseAdmin } from "@/lib/supabase";

/** Ein Select — alle vier Datenbanken (BW/TEO, Staging/Prod) haben dieselbe Struktur. */
const KUNDE_SELECT =
  "id, name, email, portal_modus, org_kennung, org_anzeigename, org_logo_url, org_hero_url, freigabe_modus, freigabe_schwelle_eur, notfall_direkt, akut_fall_ids, org_primary_color, org_primary_color_dk, org_primary_color_soft, org_logo_kuerzel, org_sub, org_telefon, org_strasse, org_hausnummer, org_plz, org_ort, strasse, hausnummer, plz, ort, mieter_kontakt_telefon, mieter_kontakt_email, mieter_kontakt_hinweis, av_akzeptiert_am, av_version, av_akzeptiert_von, av_text_snapshot, wl_ansprache_am, impressum_url, datenschutz_url";

/** Lädt Auftraggeber-Stammdaten der Verwaltung. */
export async function loadOrganisationKunde(
  kundeId: string
): Promise<OrganisationKunde | null> {
  const { data, error } = await supabaseAdmin
    .from("kunden")
    .select(KUNDE_SELECT)
    .eq("id", kundeId)
    .maybeSingle();
  if (error) {
    logDbError('lib/org/load-organisation-kunde:kunden', error)
    return null;
  }
  if (!data) return null;
  const row = data as unknown as Record<string, unknown>;
  if (row.portal_modus !== "organisation") return null;
  let kunde: OrganisationKunde = {
    ...(row as OrganisationKunde),
    akut_fall_ids: normalizeAkutFallIds(row.akut_fall_ids),
  };
  // Legal-Links gesetzt, Kennung fehlt → still vergeben (Melde-Link)
  if (orgMeldeLegalUrlsReady(kunde) && !kunde.org_kennung?.trim()) {
    const kennung = await ensureOrgKennung(kunde);
    if (kennung) kunde = { ...kunde, org_kennung: kennung };
  }
  return kunde;
}
