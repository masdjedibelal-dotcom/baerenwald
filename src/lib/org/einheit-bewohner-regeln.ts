/**
 * Einheit-Belegung & Vorgang-Mieter-Zuordnung.
 *
 * - Mieter → immer „bewohnt“ / in der Mieter-Liste
 * - Eigentümer nur wenn selbstbewohnt
 * - Eigentümer ohne selbstbewohnt → kein Belegt-Status, nicht in Mieter-Zuordnung
 */

export type BewohnerRolleLike = "mieter" | "eigentuemer" | string | null | undefined;

export function isEigentuemerSelbstbewohnt(b: {
  rolle?: BewohnerRolleLike;
  selbstbewohnt?: boolean | null;
}): boolean {
  return (
    String(b.rolle ?? "").toLowerCase() === "eigentuemer" &&
    Boolean(b.selbstbewohnt)
  );
}

/** Person zählt für Belegung (belegt vs. leer). */
export function bewohnerBelegtEinheit(b: {
  rolle?: BewohnerRolleLike;
  selbstbewohnt?: boolean | null;
}): boolean {
  const rolle = String(b.rolle ?? "mieter").toLowerCase();
  if (rolle === "eigentuemer") return Boolean(b.selbstbewohnt);
  return true; // mieter / legacy ohne Rolle
}

/** Person darf in HV „Mieter zuordnen“ erscheinen. */
export function bewohnerInMieterZuordnung(b: {
  rolle?: BewohnerRolleLike;
  selbstbewohnt?: boolean | null;
}): boolean {
  return bewohnerBelegtEinheit(b);
}

/** Einheit hat selbstbewohnenden Eigentümer → kein zusätzlicher Mieter. */
export function einheitMieterAddGesperrt(
  people: Array<{ rolle?: BewohnerRolleLike; selbstbewohnt?: boolean | null }>
): boolean {
  return people.some((p) => isEigentuemerSelbstbewohnt(p));
}
