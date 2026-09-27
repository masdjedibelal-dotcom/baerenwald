/**
 * Stundensatz nach Zielgruppe — geteilter Baustein.
 * `ansicht` ist Pflicht ohne Default: Partner sieht Partnersatz, Kunde Kundensatz.
 */

export type PreisAnsicht = "partner" | "kunde";

export type StundensatzFelder = {
  /** Pflicht — wer den Baustein nutzt, muss die Seite wählen. */
  ansicht: PreisAnsicht;
  /** Partnersatz (was Bärenwald dem Handwerker zahlt). */
  stundensatz?: number | null;
  /** Kundensatz (was der Kunde zahlt). Nur für ansicht "kunde" relevant. */
  stundensatz_kunde?: number | null;
};

function positive(n: number | null | undefined): number | null {
  if (n == null) return null;
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return null;
  return v;
}

/**
 * Partner → nur `stundensatz`.
 * Kunde → `stundensatz_kunde`, sonst Rückfall auf `stundensatz` (Altdaten, wie CRM).
 */
export function resolveStundensatz(opts: StundensatzFelder): number | null {
  if (opts.ansicht === "partner") {
    return positive(opts.stundensatz);
  }
  return positive(opts.stundensatz_kunde) ?? positive(opts.stundensatz);
}
