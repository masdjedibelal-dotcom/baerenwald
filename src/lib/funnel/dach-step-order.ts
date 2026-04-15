import type { FachdetailsState, Situation } from "./types";

/** Sanieren nur Dach: Fachdetails vor Größe, damit Kleinaufträge (Ziegel / Dachfenster) ohne Fläche möglich sind */
export function shouldSwapFachdetailsBeforeGroesse(
  situation: Situation | null,
  bereiche: string[]
): boolean {
  return (
    situation === "sanieren" &&
    bereiche.length === 1 &&
    bereiche[0] === "dach"
  );
}

export function skipGroesseForSanierenDachKleinjob(
  fachdetails: FachdetailsState | undefined
): boolean {
  const v = fachdetails?.dach?.vorhaben;
  return v === "ziegel" || v === "dachfenster";
}
