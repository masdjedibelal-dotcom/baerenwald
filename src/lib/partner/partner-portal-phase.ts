import type { PartnerAnfrageItem } from "@/lib/partner/get-partner-data";
import { isPartnerAnfrageOffen } from "@/lib/partner/partner-anfrage-status";

/** Menü-Bereich im Partner-Portal (Website). */
export type PartnerPortalPhase = "anfrage" | "angebot" | "auftrag";

/**
 * Phasen-Regeln (Single Source of Truth für Portal-Daten):
 *
 * 1) angebot_handwerker (klassischer Angebots-Funnel)
 *    - anfrage: HW antwortet / Preiseinigung (bis hw_status = uebernommen)
 *    - angebot: Preise vereinbart — optional Angebots-PDF, Vertragspaket
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
  item: Pick<
    PartnerAnfrageItem,
    | "status"
    | "antwort_at"
    | "gesendet_at"
    | "hw_eingereicht_at"
    | "hw_status"
    | "projektvertrag_bestaetigt_am"
    | "projektvertrag_bereit"
  >
): PartnerPortalPhase {
  const st = item.status.toLowerCase();
  const hwSt = (item.hw_status ?? "").toLowerCase();

  if (st === "abgelehnt") return "auftrag";

  /** Preiseinigung noch offen → Tab Anfragen. */
  if (isPartnerAnfrageOffen(item)) return "anfrage";
  if (st === "akzeptiert" && hwSt !== "uebernommen") return "anfrage";

  /** CRM hat Konditionen übernommen — Vertragspaket unter Angebote bis HW bestätigt. */
  if (hwSt === "uebernommen") {
    if (item.projektvertrag_bestaetigt_am) return "auftrag";
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

/** Auftrag in „Anfragen“, solange HW noch antworten soll. */
export function isAuftragAnfrageListItem(item: {
  portalPhase: PartnerPortalPhase;
  hwStatus: string;
}): boolean {
  if (item.portalPhase !== "anfrage") return false;
  return !HW_BEANTWORTET.has(item.hwStatus.toLowerCase());
}

/** Auftrag in „Aufträge“ — nach CRM-Bestätigung + verbindlicher Vertragsannahme. */
export function isAuftragAuftraegeListItem(item: {
  portalPhase: PartnerPortalPhase;
  angebotHandwerkerId?: string | null;
  hwStatus: string;
  projektvertrag_bestaetigt_am?: string | null;
}): boolean {
  if (item.portalPhase !== "auftrag") return false;
  const h = item.hwStatus.toLowerCase();
  if (h === "akzeptiert") return false;
  /** Noch Angebot/Vertragspaket offen → Tab Angebote. */
  if (item.angebotHandwerkerId) return false;
  if (!item.projektvertrag_bestaetigt_am) return false;
  return true;
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
