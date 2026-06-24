import type { MeldeKategorie } from "@/lib/org/types";

export const MELDE_KATEGORIEN: Array<{
  id: MeldeKategorie;
  label: string;
  hint: string;
  dringend?: boolean;
}> = [
  {
    id: "notfall",
    label: "Notfall",
    hint: "Akute Gefahr oder kompletter Ausfall",
    dringend: true,
  },
  {
    id: "schaden",
    label: "Schaden",
    hint: "Wasserschaden, Einbruch, Sturmschaden …",
  },
  {
    id: "reparatur",
    label: "Reparatur",
    hint: "Defekt, aber keine akute Gefahr",
  },
  {
    id: "sonstiges",
    label: "Sonstiges",
    hint: "Alles andere kurz beschreiben",
  },
];

export function meldeKategorieLabel(id: string | null | undefined): string {
  const hit = MELDE_KATEGORIEN.find((k) => k.id === id);
  return hit?.label ?? "Meldung";
}

export function meldeKategorieToSituation(
  kategorie: MeldeKategorie
): string {
  if (kategorie === "notfall") return "kaputt";
  return "kaputt";
}

export function meldeKategorieToZeitraum(
  kategorie: MeldeKategorie
): string {
  if (kategorie === "notfall") return "sofort";
  if (kategorie === "schaden") return "diese_woche";
  return "flexibel";
}
