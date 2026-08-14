/**
 * Handwerker-PDFs aus dem Partner-Portal → CRM (Stufe 1).
 *
 * Speicherort: Tabelle `angebot_handwerker`, Bucket `handwerker-uploads`.
 * Kein eigener Dokumenttyp in der DB — CRM leitet ab aus dem Feld:
 * - `hw_angebot_anhang_urls` / `hw_angebot_pdf_url` → Unterlagen (Angebot, Protokoll, …)
 * - `hw_rechnung_pdf_url` → Rechnung
 *
 * CRM muss `hw_angebot_anhang_urls`, `hw_rechnung_pdf_url`, `hw_rechnung_eingereicht_at`
 * im Auftrags-Join laden (aktuell fehlen sie in AUFTRAG_DETAIL_SELECT).
 */

export type PartnerHwDokumentArt = "unterlage" | "rechnung";

/** Max. gespeicherte Unterlagen-Pfade pro Zuweisung (über mehrere Uploads). */
export const PARTNER_MAX_HW_UNTERLAGEN_GESAMT = 10;

export const PARTNER_HW_DOKUMENT_CRM_LABEL = {
  unterlage: "Handwerker · Unterlage",
  unterlageNr: (nr: number) => `Handwerker · Unterlage ${nr}`,
  rechnung: "Handwerker · Rechnung",
} as const;

export function partnerHwDokumentListenName(
  art: PartnerHwDokumentArt,
  opts?: { index?: number; total?: number }
): string {
  if (art === "rechnung") return PARTNER_HW_DOKUMENT_CRM_LABEL.rechnung;
  const total = opts?.total ?? 1;
  const index = opts?.index ?? 0;
  if (total <= 1) return PARTNER_HW_DOKUMENT_CRM_LABEL.unterlage;
  return PARTNER_HW_DOKUMENT_CRM_LABEL.unterlageNr(index + 1);
}

/** Storage-Pfade aus `hw_angebot_anhang_urls` (jsonb) inkl. Fallback auf Primär-PDF. */
export function parseHwAnhangStoragePaths(
  raw: unknown,
  fallbackPath: string | null | undefined
): string[] {
  if (Array.isArray(raw)) {
    const paths = raw.map((x) => String(x).trim()).filter(Boolean);
    if (paths.length) return paths;
  }
  const fb = fallbackPath?.trim();
  return fb ? [fb] : [];
}
