import { isAuftragAbgeschlossen } from "@/lib/partner/handwerker-bewertung-display";

/**
 * Laufende Aufträge in „Meine Aufträge“ — nicht mit Tab „Offen“ (Anfrage/Angebot/Leistung) verwechseln.
 * CRM-Status `offen` bedeutet hier: Projekt läuft → „In Bearbeitung“.
 */
export function partnerAuftragListenStatusLabel(status: string): string {
  const s = status.toLowerCase();
  if (s === "storniert") return "Storniert";
  if (isAuftragAbgeschlossen(status)) return "Abgeschlossen";
  if (s === "abnahme") return "Abnahme";
  return "In Bearbeitung";
}

export function partnerAuftragListenStatusPillKey(status: string): string {
  const s = status.toLowerCase();
  if (s === "storniert") return "storniert";
  if (isAuftragAbgeschlossen(status)) return "abgeschlossen";
  if (s === "abnahme") return "abnahme";
  return "in_arbeit";
}

/** Phasen-Streifen: laufender Auftrag nicht als CRM-„offen“/Planung-only darstellen. */
export function partnerAuftragStatusFuerPhasen(status?: string | null): string {
  const s = (status ?? "").toLowerCase();
  if (s === "storniert" || isAuftragAbgeschlossen(status ?? "")) return status ?? "";
  if (s === "offen" || s === "planung" || s === "vorbereitung") return "in_arbeit";
  return status ?? "in_arbeit";
}
