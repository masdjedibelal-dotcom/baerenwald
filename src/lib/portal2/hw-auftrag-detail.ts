/**
 * Handwerker Auftrag-Detail — Copy & Timeline (Mock screenAuftrag).
 */

import { PORTAL_VAR } from "@/lib/portal2/tokens";
import type { VorgangState } from "@/lib/partner/vorgang-state";

export const HW_AUFTRAG_COPY = {
  beschreibungTitle: "Beschreibung",
  ausfuehrenTitle: "Auftrag ausführen",
  ausfuehrenBody:
    "Dokumentieren Sie je Leistung: Startfoto → optional Fortschritt → Endfoto. Bei Regie/Aufwand Zeit miterfassen.",
  ausfuehrenCta: "Auftrag abschließen →",
  ausfuehrenHint:
    "Nach Dokumentation je Leistung: Abnahme mit Signatur. Danach Rechnung prüfen & einreichen.",
  leistungenTitle: "Leistungen & Vergütung",
  einsatzTitle: "Einsatz",
  verlaufTitle: "Verlauf",
  bautagebuchTitle: "Zusatznotiz für die Verwaltung",
  bautagebuchHint:
    "Freies Bautagebuch — Zusatznotiz an die HV, kein Ersatz für Start-/Endfotos je Leistung.",
  unterlagenTitle: "Unterlagen",
  statusBeauftragt: "Beauftragt",
} as const;

export type HwAuftragTimelineStepId =
  | "angefragt"
  | "angebot"
  | "auftrag"
  | "abschluss"
  | "erledigt";

export const HW_AUFTRAG_TIMELINE: Array<{
  id: HwAuftragTimelineStepId;
  label: string;
}> = [
  { id: "angefragt", label: "Angefragt" },
  { id: "angebot", label: "Angebot" },
  { id: "auftrag", label: "Auftrag" },
  { id: "abschluss", label: "Abschluss" },
  { id: "erledigt", label: "Erledigt" },
];

/** Aktiver Timeline-Index aus Vorgangs-State / Auftragsstatus. */
export function hwAuftragTimelineIndex(input: {
  vorgangState?: VorgangState;
  auftragStatus?: string;
}): number {
  const st = (input.auftragStatus ?? "").toLowerCase();
  if (
    st === "abgeschlossen" ||
    st === "storniert" ||
    input.vorgangState === "erledigt"
  ) {
    return 4;
  }
  if (st === "abnahme" || st.includes("abschluss")) {
    return 3;
  }
  if (
    input.vorgangState === "in_bearbeitung" ||
    input.vorgangState === "geaendert" ||
    st === "in_arbeit" ||
    st === "offen"
  ) {
    return 2;
  }
  if (input.vorgangState === "neu") {
    return 0;
  }
  return 2;
}

export function hwAuftragStatusLabel(input: {
  vorgangState?: VorgangState;
  fallback?: string;
}): string {
  if (input.vorgangState === "erledigt") return "Erledigt";
  if (input.vorgangState === "neu") return "Aktion nötig";
  if (input.vorgangState === "geaendert") return "Geändert";
  return input.fallback?.trim() || HW_AUFTRAG_COPY.statusBeauftragt;
}

export function hwAuftragStatusStyle(label: string): {
  color: string;
  backgroundColor: string;
} {
  const s = label.toLowerCase();
  if (s.includes("erledigt") || s.includes("abgeschlossen")) {
    return { color: "#4B5563", backgroundColor: "#EAEDEC" };
  }
  if (s.includes("aktion") || s.includes("neu") || s.includes("geändert")) {
    return { color: "#8A5A06", backgroundColor: "#FBF1D6" };
  }
  return { color: "#1F6A3F", backgroundColor: "#DDEEDF" };
}

export function formatHwTerminRange(
  start?: string | null,
  end?: string | null
): string | null {
  const fmt = (v: string) => {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };
  const a = start?.trim() ? fmt(start) : null;
  const b = end?.trim() ? fmt(end) : null;
  if (a && b && a !== b) return `${a}–${b}`;
  return a || b;
}

export function formatHwLeistungMeta(input: {
  menge?: number | null;
  einheit?: string | null;
  gewerk?: string | null;
}): string | null {
  const menge =
    input.menge != null && Number.isFinite(input.menge)
      ? String(input.menge).replace(".", ",")
      : null;
  const einheit = input.einheit?.trim() || null;
  const left = [menge, einheit].filter(Boolean).join(" ");
  const gewerk = input.gewerk?.trim() || null;
  const parts = [left || null, gewerk].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

export const HW_DETAIL_CARD_BORDER = PORTAL_VAR.line;
