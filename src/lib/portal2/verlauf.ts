/**
 * Portal 2.0 TEIL G1 — Verlauf-Schreibmuster (`patchVg`).
 * Format: { t: "Gerade eben", txt, who } — real = Timeline-Log je Vorgang.
 */

export type VerlaufEntry = {
  t: string;
  txt: string;
  who: string;
};

export const VERLAUF_JUST_NOW = "Gerade eben" as const;
export const VERLAUF_WHO_SYSTEM = "System" as const;

/** Mock `patchVg` Log-Eintrag vorne anhängen. */
export function prependVerlaufEntry(
  existing: VerlaufEntry[] | null | undefined,
  txt: string,
  who: string = VERLAUF_WHO_SYSTEM,
  t: string = VERLAUF_JUST_NOW
): VerlaufEntry[] {
  const entry: VerlaufEntry = { t, txt, who: who || VERLAUF_WHO_SYSTEM };
  return [entry, ...(existing ?? [])];
}

/** Spec-Anzeige: „{Zeit} · {Text} · {Wer}“ */
export function formatVerlaufLine(e: VerlaufEntry): string {
  return `${e.t} · ${e.txt} · ${e.who}`;
}
