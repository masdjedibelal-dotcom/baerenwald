/**
 * Melde-Bereiche für Kaputt-/HV-Meldung (UI + Mapping auf Funnel-bereiche).
 */

export type MeldeBereichId =
  | "wasser"
  | "heizung"
  | "strom"
  | "fenster_tuer"
  | "dach"
  | "schimmel"
  | "sonstiges"
  /** @deprecated Nur Legacy-Leads; UI → Sonstiges */
  | "baum_notfall";

export type MeldeBereichOption = {
  id: MeldeBereichId;
  label: string;
  hint: string;
  /** Wert für leads.bereiche / price-calc */
  bereich: string;
  icon?: string;
};

export const MELDE_BEREICHE: MeldeBereichOption[] = [
  {
    id: "wasser",
    label: "Wasser / Rohr / WC",
    hint: "tropft, läuft aus, verstopft, von oben",
    bereich: "sanitaer",
    icon: "08-bad",
  },
  {
    id: "heizung",
    label: "Heizung / Warmwasser",
    hint: "kalt, geht nicht, kein Warmwasser",
    bereich: "heizung",
    icon: "05-heizung",
  },
  {
    id: "strom",
    label: "Strom / Sicherung",
    hint: "kein Strom, fliegt raus, steckt nicht",
    bereich: "elektro",
    icon: "06-elektrik",
  },
  {
    id: "fenster_tuer",
    label: "Fenster / Tür",
    hint: "klemmt, undicht, Schloss, Glas",
    bereich: "fenster_tuer",
    icon: "11-fenster",
  },
  {
    id: "dach",
    label: "Dach / Regenrinne",
    hint: "undicht, Wasser von oben, Rinne",
    bereich: "dach",
    icon: "12-dach",
  },
  {
    id: "schimmel",
    label: "Schimmel / Feuchtigkeit",
    hint: "Flecken, muffiger Geruch, feuchte Wand",
    bereich: "schimmel",
    icon: "02-reparatur",
  },
  {
    id: "sonstiges",
    label: "Sonstiges / Haus / Weg",
    hint: "Müll, Treppenhaus, Wespen, Ast/Weg — kurz beschreiben",
    bereich: "sonstiges",
    icon: "02-reparatur",
  },
];

export function meldeBereichToFunnelBereiche(id: MeldeBereichId): string[] {
  const opt = MELDE_BEREICHE.find((o) => o.id === id);
  if (!opt) return ["sonstiges"];
  if (opt.bereich === "sonstiges") return ["sonstiges"];
  if (opt.bereich === "schimmel") return ["feuchtigkeit_schimmel", "schimmel"];
  if (opt.bereich === "elektro") return ["elektro", "strom"];
  return [opt.bereich];
}

export function isMeldeBereichId(v: string): v is MeldeBereichId {
  return MELDE_BEREICHE.some((o) => o.id === v) || v === "baum_notfall";
}

export function meldeBereichLabel(id: string | null | undefined): string {
  if (id === "baum_notfall") return "Sonstiges / Haus / Weg";
  const opt = MELDE_BEREICHE.find((o) => o.id === id);
  return opt?.label ?? "Sonstiges";
}
