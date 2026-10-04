import type { OrganisationKunde } from "@/lib/org/types";

export type HvMeldungStatus =
  | "neu"
  | "notmassnahme"
  | "angebot_eingefordert"
  | "kleinreparatur"
  | "abgelehnt"
  | "abgeschlossen"
  | "hm_pruefung"
  | "hm_erledigt";

/**
 * Neue Meldung: wartet auf HV.
 * `nicht_noetig` = noch keine Angebots-Freigabe fällig (nicht automatisch Akut).
 * Echter Akut setzt zusätzlich `freigabe_bypass_grund = "akut"`.
 */
export function initialHvMeldungState(): {
  hv_meldung_status: HvMeldungStatus;
  org_freigabe_status: "nicht_noetig";
} {
  return {
    hv_meldung_status: "neu",
    org_freigabe_status: "nicht_noetig",
  };
}

export function canOfferKleinreparatur(
  _kunde: Pick<
    OrganisationKunde,
    "kleinreparatur_aktiv" | "freigabe_schwelle_eur"
  >,
  _preisMax: number | null | undefined
): boolean {
  // Kanon: kein Kleinreparatur-Sonderpfad mehr
  return false;
}

export function formatPreisspanneDisplay(
  preisMin: number | null | undefined,
  preisMax: number | null | undefined,
  preisUnsicher?: boolean | null
): string {
  if (preisUnsicher || preisMin == null || preisMax == null) {
    return "Preis nach Prüfung durch Bärenwald";
  }
  if (preisMin <= 0 && preisMax <= 0) {
    return "Preis nach Prüfung durch Bärenwald";
  }
  if (Math.abs(preisMin - preisMax) < 1) {
    return `ca. ${preisMin.toLocaleString("de-DE")} € netto`;
  }
  return `ca. ${preisMin.toLocaleString("de-DE")} – ${preisMax.toLocaleString("de-DE")} € netto`;
}
