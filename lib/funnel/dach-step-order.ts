import type { FachdetailsState, Situation } from "./types";

/** Sanieren nur Dach: Fachdetails vor Größe, damit Kleinaufträge (Ziegel / Dachfenster) ohne Fläche möglich sind */
export function shouldSwapFachdetailsBeforeGroesse(
  situation: Situation | null,
  bereiche: string[]
): boolean {
  if (bereiche.length !== 1) return false;
  const only = bereiche[0];
  if (
    (situation === "erneuern" || situation === "kaputt") &&
    only === "dach"
  ) {
    return true;
  }
  /** Nur Boden: Fachdetails vor Größe (z. B. Balkon m² 3–30 erst nach Auswahl „Balkon / Terrasse“). */
  if ((situation === "erneuern" || situation === "kaputt") && only === "boden") {
    return true;
  }
  return false;
}

export function skipGroesseForSanierenDachKleinjob(
  fachdetails: FachdetailsState | undefined
): boolean {
  const v = fachdetails?.dach?.vorhaben;
  return (
    v === "ziegel_wenige" ||
    v === "ziegel_bereich" ||
    v === "dachfenster"
  );
}
