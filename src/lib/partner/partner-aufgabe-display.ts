/**
 * Partner-Aufgabe: nur Anzeige — keine Status-/Zeit-/Abrechnungslogik.
 */

export function partnerAufgabeGruppenkopfTitel(
  titel: string | null | undefined,
  positionen: Array<{ leistung_name: string }>
): string {
  const t = (titel ?? "").trim();
  if (t) return t;
  const names = positionen
    .map((p) => p.leistung_name.trim())
    .filter(Boolean);
  if (names.length === 0) return "Leistung";
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} · ${names[1]}`;
  return `${names[0]} · ${names.length - 1} weitere`;
}
