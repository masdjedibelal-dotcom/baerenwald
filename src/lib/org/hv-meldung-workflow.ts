import { MARKE } from "@/lib/marke";

export type HvMeldungStatus =
  | "neu"
  | "notmassnahme"
  | "angebot_eingefordert"
  | "abgelehnt"
  | "abgeschlossen";

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

export function formatPreisspanneDisplay(
  preisMin: number | null | undefined,
  preisMax: number | null | undefined,
  preisUnsicher?: boolean | null
): string {
  if (preisUnsicher || preisMin == null || preisMax == null) {
    return `Preis nach Prüfung durch ${MARKE.name}`;
  }
  if (preisMin <= 0 && preisMax <= 0) {
    return `Preis nach Prüfung durch ${MARKE.name}`;
  }
  if (Math.abs(preisMin - preisMax) < 1) {
    return `ca. ${preisMin.toLocaleString("de-DE")} € netto`;
  }
  return `ca. ${preisMin.toLocaleString("de-DE")} – ${preisMax.toLocaleString("de-DE")} € netto`;
}
