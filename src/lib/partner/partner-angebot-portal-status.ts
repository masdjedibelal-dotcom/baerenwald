import type { PartnerAnfrageItem } from "@/lib/partner/get-partner-data";
import { isPartnerAnfrageKonditionenNachreichung } from "@/lib/partner/partner-anfrage-status";

/** Angebots-Phase nach HW-Bestätigung (hw_status = uebernommen). */
export type PartnerAngebotPortalPhase =
  | "wartet_auf_freigabe"
  | "auftrag_freigegeben"
  | "angenommen";

export function resolvePartnerAngebotPortalPhase(
  item: Pick<
    PartnerAnfrageItem,
    "hw_status" | "auftrag_id" | "auftrag_status" | "projektvertrag_bestaetigt_am"
  >
): PartnerAngebotPortalPhase | null {
  const hwSt = (item.hw_status ?? "").toLowerCase();
  if (hwSt !== "uebernommen") return null;
  if (item.projektvertrag_bestaetigt_am) return "angenommen";

  const auftragSt = (item.auftrag_status ?? "offen").toLowerCase();
  if (!item.auftrag_id || auftragSt === "offen") return "wartet_auf_freigabe";
  return "auftrag_freigegeben";
}

/**
 * Offen in Angebote: solange der Vorgang im Tab Angebote ist.
 * Inkl. „Warte auf Freigabe“ und „Auftrag freigegeben“.
 * Geschlossen erst nach Auftragsannahme (→ Tab Aufträge).
 */
export function isPartnerAngebotListItemOffen(item: PartnerAnfrageItem): boolean {
  const phase = resolvePartnerAngebotPortalPhase(item);
  if (phase === "angenommen") return false;
  if (phase === "wartet_auf_freigabe" || phase === "auftrag_freigegeben") return true;
  return (item.hw_status ?? "").toLowerCase() === "uebernommen";
}

/** HW muss handeln (Vertrag + Unterlagen + Auftrag annehmen). */
export function isPartnerAngebotAktionErforderlich(item: PartnerAnfrageItem): boolean {
  return resolvePartnerAngebotPortalPhase(item) === "auftrag_freigegeben";
}

export function partnerAngebotPortalStatusLabel(
  item: Pick<
    PartnerAnfrageItem,
    "hw_status" | "auftrag_id" | "auftrag_status" | "projektvertrag_bestaetigt_am"
  >
): string {
  const phase = resolvePartnerAngebotPortalPhase(item);
  if (phase === "wartet_auf_freigabe") return "Warte auf Auftragsfreigabe";
  if (phase === "auftrag_freigegeben") return "Auftrag freigegeben";
  if (phase === "angenommen") return "Angenommen";

  const hwSt = (item.hw_status ?? "").toLowerCase();
  if (hwSt === "eingereicht") return "Wartet auf Prüfung";
  if (hwSt === "uebernommen") return "Angebot offen";
  return "Offen";
}

export function partnerAngebotPortalStatusPillKey(
  item: Pick<
    PartnerAnfrageItem,
    "hw_status" | "auftrag_id" | "auftrag_status" | "projektvertrag_bestaetigt_am"
  >
): string {
  const phase = resolvePartnerAngebotPortalPhase(item);
  if (phase === "wartet_auf_freigabe") return "warte_freigabe";
  if (phase === "auftrag_freigegeben") return "auftrag_freigegeben";
  if (phase === "angenommen") return "geschlossen";
  const hwSt = (item.hw_status ?? "").toLowerCase();
  if (hwSt === "eingereicht") return "eingereicht";
  if (hwSt === "uebernommen") return "uebernommen";
  return "offen";
}

export function partnerAngebotListenHint(
  item: Pick<
    PartnerAnfrageItem,
    | "hw_status"
    | "auftrag_id"
    | "auftrag_status"
    | "projektvertrag_bestaetigt_am"
    | "crm_positionen_raw"
    | "crm_auftrag_positionen"
    | "gewerk_id"
    | "gewerk_name"
    | "handwerker_id"
    | "hw_konditionen"
  >
): string | undefined {
  if (isPartnerAnfrageKonditionenNachreichung(item)) {
    return "→ Neue Leistung unter Anfragen";
  }
  const phase = resolvePartnerAngebotPortalPhase(item);
  if (phase === "wartet_auf_freigabe") return "→ Warte auf Freigabe";
  if (phase === "auftrag_freigegeben") return "→ Auftrag annehmen";
  if (phase === "angenommen") return "→ Unter Aufträge";
  return undefined;
}
