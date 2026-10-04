
/** Menü-Bereich im Partner-Portal (Website). */
export type PartnerPortalPhase = "anfrage" | "angebot" | "auftrag";

/**
 * Phasen-Regeln (Single Source of Truth für Portal-Daten):
 *
 * 1) angebot_handwerker (klassischer Angebots-Funnel)
 *    - anfrage: HW antwortet / Preiseinigung / CRM-Einigung bestätigen (bis hw_status = uebernommen)
 *    - angebot: HW hat bestätigt — Angebots-PDF, Vertragspaket (bis CRM Auftrag freigibt)
 *    - auftrag: (nicht im Portal-Listen-Funnel)
 *
 * 2) auftrag_handwerker / auftrag_positionen (CRM weist Leistung am Auftrag zu)
 *    - anfrage: Auftrag.status === "offen" ODER HW-Status ausstehend (angefragt, …)
 *    - auftrag: Auftrag läuft (z. B. in_arbeit, abgeschlossen) und HW nicht mehr „offen“
 *
 * Das Frontend soll nur noch die vom Server gelieferten Listen nutzen
 * (anfragen, angebote, auftragAnfragen, auftraege) — nicht selbst nach auftraege.status filtern.
 */

const HW_PENDING = new Set(["angefragt", "ausstehend", "warten", "offen"]);

/** Aggregierter HW-Status für einen Auftrag (Zuweisung + Positionen). */
export function aggregateAuftragHandwerkerStatus(
  zuweisungStatuses: string[],
  positionStatuses: Array<string | null | undefined>
): string {
  const statuses = [
    ...zuweisungStatuses.map((s) => s.toLowerCase()),
    ...positionStatuses
      .filter((s): s is string => Boolean(s?.trim()))
      .map((s) => s.toLowerCase()),
  ];
  if (!statuses.length) return "ausstehend";

  const priority = [
    "angefragt",
    "ausstehend",
    "warten",
    "zugewiesen",
    "akzeptiert",
    "abgelehnt",
  ];
  for (const p of priority) {
    if (statuses.includes(p)) return p;
  }
  return statuses[0]!;
}

export function resolveAuftragPortalPhase(
  auftragStatus: string,
  hwStatus: string | null | undefined
): PartnerPortalPhase {
  const a = auftragStatus.toLowerCase();
  const h = (hwStatus ?? "ausstehend").toLowerCase();

  if (a === "storniert") return "auftrag";
  if (h === "abgelehnt") return "auftrag";

  /**
   * Nach Zusage am offenen Projekt: Preis/PDF unter „Angebote“ — nicht unter Aufträge.
   */
  if (a === "offen" && h === "akzeptiert") return "angebot";

  /** CRM-Projekt noch nicht gestartet → HW soll zu-/absagen. */
  if (a === "offen") return "anfrage";

  if (HW_PENDING.has(h)) return "anfrage";

  return "auftrag";
}
