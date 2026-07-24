/**
 * F-Wave — Partner Abnahme / Rechnung UX Copy & Helpers.
 */

import type { PartnerAuftragPosition } from "@/lib/partner/get-partner-data";
import { HW_ABSCHLUSS_CHECKS, type HwAbschlussCheckId } from "@/lib/portal2/hw-kalkulation";

export const HW_ABNAHME_COPY = {
  cta: "Auftrag abschließen →",
  ctaHint:
    "Nach der Dokumentation je Leistung: Abnahme mit Signatur — danach Rechnung.",
  positionEndeCta: "3. Ende — Dokumentieren",
  positionEndeToast: "Leistung dokumentiert — bereit für Abnahme.",
  positionEndeBody:
    "Ergebnis-Foto speichert die Dokumentation. Der Auftrag ist erst nach Signatur abgeschlossen.",
  rechnungTitle: "Rechnung prüfen & einreichen",
  rechnungBody:
    "Nach der Abnahme: Entwurf aus Firmendaten und Konditionen prüfen, dann einreichen. Bei unvollständigen Angaben erscheint ein Hinweis.",
  rechnungBlockedOhneAbnahme:
    "Zuerst Auftrag abschließen (Signatur). Danach können Sie die Rechnung einreichen.",
  kundeSigHint:
    "Gegenzeichnung vor Ort empfohlen — Name ist Pflicht, Zeichnung bitte mit dem Kunden.",
  kundeSigRequiredSoft: "Bitte den Kunden vor Ort gegenzeichnen lassen.",
  mobileSigHint:
    "Tipp: Querformat oder größeres Feld für die Unterschrift nutzen.",
} as const;

/** Pro Leistung: Auftrag-Checks, vorbelegt wenn Leistung dokumentiert (Ende). */
export type LeistungAbschlussCheckState = {
  leistungId: string;
  leistungName: string;
  dokumentiert: boolean;
  checks: Record<HwAbschlussCheckId, boolean>;
};

export function buildLeistungAbschlussChecks(
  positionen: Array<
    Pick<PartnerAuftragPosition, "id" | "leistung_name" | "leistung_status">
  >
): LeistungAbschlussCheckState[] {
  return positionen.map((p) => {
    const dokumentiert =
      String(p.leistung_status ?? "").toLowerCase() === "erledigt";
    const checks = Object.fromEntries(
      HW_ABSCHLUSS_CHECKS.map((c) => [c.id, dokumentiert])
    ) as Record<HwAbschlussCheckId, boolean>;
    return {
      leistungId: p.id,
      leistungName: String(p.leistung_name ?? "Leistung").trim() || "Leistung",
      dokumentiert,
      checks,
    };
  });
}

export function allLeistungChecksDone(
  rows: LeistungAbschlussCheckState[]
): boolean {
  if (!rows.length) return false;
  return rows.every((row) =>
    HW_ABSCHLUSS_CHECKS.every((c) => row.checks[c.id])
  );
}

export function flattenAbschlussChecksForPersist(
  rows: LeistungAbschlussCheckState[]
): {
  global: Record<string, boolean>;
  leistungen: Array<{
    id: string;
    name: string;
    dokumentiert: boolean;
    checks: Record<string, boolean>;
  }>;
} {
  const global: Record<string, boolean> = {};
  for (const c of HW_ABSCHLUSS_CHECKS) {
    global[c.id] = rows.length
      ? rows.every((r) => r.checks[c.id])
      : false;
  }
  return {
    global,
    leistungen: rows.map((r) => ({
      id: r.leistungId,
      name: r.leistungName,
      dokumentiert: r.dokumentiert,
      checks: { ...r.checks },
    })),
  };
}
