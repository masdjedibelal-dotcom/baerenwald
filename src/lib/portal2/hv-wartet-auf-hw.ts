/**
 * C4 — HV Meta „wartet auf HW“ aus Partner-Signalen.
 */

import { auftragBrauchtHandwerkerAktion } from "@/lib/crm-vorgang/handwerker-aktion-offen";

export type HvWartetAufHwSignals = {
  /** Positionen mit handwerker_id / handwerker_status */
  positionen?: Array<{
    handwerker_id?: string | null;
    handwerker_status?: string | null;
    leistung_status?: string | null;
  }> | null;
  /** Offene CRM-Anforderung an Partner für Bautagebuch */
  bautagebuchAnfrageOffen?: boolean;
  /** Partner hat Termin noch nicht bestätigt */
  terminOffen?: boolean;
  /** Angebot vom HW angefragt / ausstehend */
  hwAngebotAusstehend?: boolean;
};

export type HvWartetAufHwResult = {
  label: string;
  kind: "angebot" | "termin" | "bautagebuch" | "antwort" | "leistung";
};

/**
 * Kurzer Meta-Text für HV-Liste/Detail, wenn der Vorgang auf den Handwerker wartet.
 * `null` = kein spezieller Warte-Zustand.
 */
export function resolveHvWartetAufHw(
  signals: HvWartetAufHwSignals
): HvWartetAufHwResult | null {
  if (signals.bautagebuchAnfrageOffen) {
    return {
      kind: "bautagebuch",
      label: "Wartet auf HW · Bautagebuch",
    };
  }
  if (signals.terminOffen) {
    return {
      kind: "termin",
      label: "Wartet auf HW · Termin",
    };
  }
  if (signals.hwAngebotAusstehend) {
    return {
      kind: "angebot",
      label: "Wartet auf HW · Angebot",
    };
  }

  const pos = signals.positionen ?? [];
  if (auftragBrauchtHandwerkerAktion(pos)) {
    return {
      kind: "antwort",
      label: "Wartet auf HW · Antwort",
    };
  }

  const offeneLeistung = pos.some((p) => {
    const st = String(p.leistung_status ?? "").toLowerCase();
    const hw = String(p.handwerker_status ?? "").toLowerCase();
    return (
      (st === "offen" || st === "in_arbeit") &&
      (hw === "uebernommen" || hw === "bestätigt" || hw === "bestaetigt")
    );
  });
  if (offeneLeistung) {
    return {
      kind: "leistung",
      label: "Wartet auf HW · Ausführung",
    };
  }

  return null;
}
