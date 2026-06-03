import type { PartnerAnfrageItem } from "@/lib/partner/get-partner-data";

/** Status, in denen der Handwerker noch annehmen/ablehnen kann. */
const PENDING_STATUS = new Set([
  "angefragt",
  "ausstehend",
  "zugewiesen",
  "offen",
]);

/**
 * Offene Bärenwald-Anfrage (HW soll antworten).
 * Primär: gesendet, noch keine Antwort. Fallback: bekannter Pending-Status ohne Antwort.
 */
export function isPartnerAnfrageOffen(item: Pick<
  PartnerAnfrageItem,
  "status" | "antwort_at" | "gesendet_at"
>): boolean {
  if (item.antwort_at) return false;
  const st = item.status.toLowerCase();
  if (st === "akzeptiert" || st === "abgelehnt") return false;
  if (item.gesendet_at) return true;
  return PENDING_STATUS.has(st);
}

export function partnerAnfrageStatusLabel(
  item: Pick<PartnerAnfrageItem, "status" | "antwort_at">
): string {
  if (item.antwort_at) {
    const s = item.status.toLowerCase();
    if (s === "akzeptiert") return "Angenommen";
    if (s === "abgelehnt") return "Abgelehnt";
  }
  if (isPartnerAnfrageOffen(item)) return "Antwort ausstehend";
  const s = item.status.toLowerCase();
  if (s === "akzeptiert") return "Angenommen";
  if (s === "abgelehnt") return "Abgelehnt";
  return item.status;
}
