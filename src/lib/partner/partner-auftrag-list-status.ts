import { isAuftragAbgeschlossen } from "@/lib/partner/handwerker-bewertung-display";

/**
 * Laufende Aufträge in „Meine Aufträge“ — nicht mit Tab „Offen“ verwechseln.
 */
export function partnerAuftragListenStatusLabel(status: string): string {
  const s = status.toLowerCase();
  if (s === "storniert") return "Storniert";
  if (isAuftragAbgeschlossen(status)) return "Abgeschlossen";
  if (s === "abnahme") return "Abnahme";
  return "Ausführung";
}

export function partnerAuftragListenStatusPillKey(status: string): string {
  const s = status.toLowerCase();
  if (s === "storniert") return "storniert";
  if (isAuftragAbgeschlossen(status)) return "abgeschlossen";
  if (s === "abnahme") return "abnahme";
  return "in_arbeit";
}
