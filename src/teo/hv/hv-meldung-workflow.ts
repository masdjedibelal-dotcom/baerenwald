import { funktionAn } from "@/lib/marke";

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
  hv_meldung_status: HvMeldungStatus | null;
  org_freigabe_status: "nicht_noetig";
} {
  return {
    // Ohne HV-Ablauf (Bärenwald) kein eigener HV-Status — die Meldung ist sofort eine Anfrage
    hv_meldung_status: funktionAn("hvWorkflow") ? "neu" : null,
    org_freigabe_status: "nicht_noetig",
  };
}
