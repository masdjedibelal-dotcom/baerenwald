import type { PartnerAnfrageItem } from "@/lib/partner/get-partner-data";
import { isPartnerAnfrageOffen } from "@/lib/partner/partner-anfrage-status";

/** Menü-Bereich im Partner-Portal (Website). */
export type PartnerPortalPhase = "anfrage" | "angebot" | "auftrag";

/**
 * Phasen-Regeln (Single Source of Truth für Portal-Daten):
 *
 * 1) angebot_handwerker (klassischer Angebots-Funnel)
 *    - anfrage: HW soll annehmen/ablehnen (isPartnerAnfrageOffen)
 *    - angebot: HW hat angenommen, Preis/PDF noch nicht eingereicht
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
const HW_BEANTWORTET = new Set(["akzeptiert", "abgelehnt"]);

export function resolveAngebotHandwerkerPhase(
  item: Pick<PartnerAnfrageItem, "status" | "antwort_at" | "gesendet_at" | "hw_eingereicht_at">
): PartnerPortalPhase {
  if (isPartnerAnfrageOffen(item)) return "anfrage";
  if (item.status.toLowerCase() === "akzeptiert" && !item.hw_eingereicht_at) {
    return "angebot";
  }
  return "auftrag";
}

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

  /** HW hat geantwortet, Projekt noch „offen“ → kein Tab „Anfragen“, Angebot unter „Angebote“. */
  if (a === "offen" && HW_BEANTWORTET.has(h)) return "auftrag";

  /** CRM-Projekt noch nicht gestartet → HW soll zu-/absagen. */
  if (a === "offen") return "anfrage";

  if (HW_PENDING.has(h)) return "anfrage";

  return "auftrag";
}

/** Auftrag in „Anfragen“, solange HW noch antworten soll. */
export function isAuftragAnfrageListItem(item: {
  portalPhase: PartnerPortalPhase;
  hwStatus: string;
}): boolean {
  if (item.portalPhase !== "anfrage") return false;
  return !HW_BEANTWORTET.has(item.hwStatus.toLowerCase());
}

export function auftragHwStatusLabel(status: string | null | undefined): string {
  const s = (status ?? "ausstehend").toLowerCase();
  const map: Record<string, string> = {
    angefragt: "Antwort ausstehend",
    ausstehend: "Ausstehend",
    warten: "Warten auf Antwort",
    zugewiesen: "Zugewiesen",
    akzeptiert: "Angenommen",
    abgelehnt: "Abgelehnt",
  };
  return map[s] ?? status ?? "Ausstehend";
}
