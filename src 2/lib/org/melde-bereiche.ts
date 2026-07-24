/** Mieterfreundliche Bereichs-Auswahl → interne Funnel-`bereiche`. */

export type MeldeBereichId =
  | "wasser"
  | "heizung"
  | "strom"
  | "fenster_tuer"
  | "dach"
  | "schimmel"
  | "baum_notfall"
  | "sonstiges";

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
    hint: "tropft, läuft aus, verstopft",
    bereich: "sanitaer",
    icon: "08-bad",
  },
  {
    id: "heizung",
    label: "Heizung / Warmwasser",
    hint: "kalt, geht nicht an",
    bereich: "heizung",
    icon: "05-heizung",
  },
  {
    id: "strom",
    label: "Strom / Sicherung",
    hint: "kein Strom, fliegt raus",
    bereich: "elektro",
    icon: "06-elektrik",
  },
  {
    id: "fenster_tuer",
    label: "Fenster / Tür",
    hint: "klemmt, undicht, Glas",
    bereich: "fenster_tuer",
    icon: "11-fenster",
  },
  {
    id: "dach",
    label: "Dach / Regenrinne",
    hint: "undicht, Ziegel locker",
    bereich: "dach",
    icon: "12-dach",
  },
  {
    id: "schimmel",
    label: "Schimmel / Feuchtigkeit",
    hint: "Fleck, muffiger Geruch",
    bereich: "schimmel",
    icon: "02-reparatur",
  },
  {
    id: "baum_notfall",
    label: "Baum / Sturm",
    hint: "Ast, umgefallen",
    bereich: "baum_notfall",
    icon: "14-gartengestaltung",
  },
  {
    id: "sonstiges",
    label: "Etwas anderes",
    hint: "kurz beschreiben",
    bereich: "sonstiges",
    icon: "02-reparatur",
  },
];

export function meldeBereichToFunnelBereiche(id: MeldeBereichId): string[] {
  const opt = MELDE_BEREICHE.find((o) => o.id === id);
  if (!opt) return ["sanitaer"];
  if (opt.bereich === "sonstiges") return ["sanitaer"];
  if (opt.bereich === "schimmel") return ["feuchtigkeit_schimmel", "schimmel"];
  if (opt.bereich === "elektro") return ["elektro", "strom"];
  return [opt.bereich];
}

export function isMeldeBereichId(v: string): v is MeldeBereichId {
  return MELDE_BEREICHE.some((o) => o.id === v);
}

export function meldeBereichLabel(id: string | null | undefined): string {
  const opt = MELDE_BEREICHE.find((o) => o.id === id);
  return opt?.label ?? "Sonstiges";
}
