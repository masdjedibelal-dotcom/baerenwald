/**
 * Beispiel-Fotos Melde-Upload — problemabhängig, nur passende Tipps.
 */

import { kaputtBereichToMeldeId } from "@/lib/funnel/melde-bereich-map";
import { meldeProblemId } from "@/lib/funnel/melde-dynamic-questions";
import type { MeldeBereichId } from "@/lib/org/melde-bereiche";

export type MeldeFotoBeispiel = {
  src: string;
  alt: string;
  tip: string;
  label: string;
};

const BASE = "/melde/foto-beispiele";

type TipKey =
  | "wasser_nah"
  | "wasser_uebersicht"
  | "heizung_hk"
  | "strom_steckdose"
  | "strom_kasten"
  | "fenster_rahmen"
  | "fenster_tuer"
  | "fenster_schloss"
  | "dach_decke"
  | "dach_rinne"
  | "schimmel_nah"
  | "schimmel_uebersicht"
  | "sonstiges";

const TIPS: Record<TipKey, MeldeFotoBeispiel> = {
  wasser_nah: {
    src: `${BASE}/wasser.webp`,
    label: "Nasse Stelle",
    alt: "Beispiel: Nahaufnahme einer feuchten oder nassen Stelle",
    tip: "Nah an die feuchte oder nasse Stelle heran — z. B. Wand, Ecke, Sockel. Bitte gut beleuchten.",
  },
  wasser_uebersicht: {
    src: `${BASE}/dach.webp`,
    label: "Übersicht",
    alt: "Beispiel: Übersicht des betroffenen Bereichs",
    tip: "Zusätzlich Übersicht des betroffenen Bereichs — Bad, Küche oder Keller.",
  },
  heizung_hk: {
    src: `${BASE}/heizung.webp`,
    label: "Heizkörper",
    alt: "Beispiel: Heizkörper mit Thermostat",
    tip: "Heizkörper und Thermostat/Ventil mit drauf — Gerät und Einstellung erkennbar.",
  },
  strom_steckdose: {
    src: `${BASE}/sonstiges.webp`,
    label: "Steckdose / Schalter",
    alt: "Beispiel: Steckdose oder Schalter",
    tip: "Steckdose oder Schalter vollständig fotografieren. Bei Brandspuren diese ebenfalls aufnehmen.",
  },
  strom_kasten: {
    src: `${BASE}/strom.webp`,
    label: "Sicherungskasten",
    alt: "Beispiel: Sicherungskasten mit ausgelöster Sicherung",
    tip: "Sicherungskasten mit ausgelöstem FI- oder Sicherungsautomaten fotografieren.",
  },
  fenster_rahmen: {
    src: `${BASE}/fenster_tuer.webp`,
    label: "Fenster",
    alt: "Beispiel: Fensterrahmen und problematische Stelle",
    tip: "Fensterrahmen und problematische Stelle fotografieren.",
  },
  fenster_tuer: {
    src: `${BASE}/fenster_tuer.webp`,
    label: "Tür",
    alt: "Beispiel: Tür und Klemmstelle",
    tip: "Tür und den Bereich, an dem es klemmt, fotografieren.",
  },
  fenster_schloss: {
    src: `${BASE}/sonstiges.webp`,
    label: "Schloss / Zylinder",
    alt: "Beispiel: Schloss oder Zylinder",
    tip: "Zylinder oder Schloss deutlich fotografieren.",
  },
  dach_decke: {
    src: `${BASE}/dach.webp`,
    label: "Wasserfleck",
    alt: "Beispiel: Wasserfleck an der Decke",
    tip: "Undichte Stelle bzw. Wasserflecken innen fotografieren.",
  },
  dach_rinne: {
    src: `${BASE}/dach.webp`,
    label: "Dachrinne / Fallrohr",
    alt: "Beispiel: Dachrinne oder Fallrohr",
    tip: "Verstopfte oder undichte Rinne bzw. Fallrohr und die betroffene Stelle fotografieren.",
  },
  schimmel_nah: {
    src: `${BASE}/schimmel.webp`,
    label: "Schimmel Nah",
    alt: "Beispiel: Schimmelflecken Nahaufnahme",
    tip: "Nahaufnahme der befallenen Stelle — Größe und Umgebung erkennbar.",
  },
  schimmel_uebersicht: {
    src: `${BASE}/schimmel.webp`,
    label: "Übersicht",
    alt: "Beispiel: Übersicht der Wandfläche",
    tip: "Bei größerer Fläche zusätzlich Übersicht der Wand aufnehmen.",
  },
  sonstiges: {
    src: `${BASE}/sonstiges.webp`,
    label: "Schaden",
    alt: "Beispiel: Schaden nah und klar",
    tip: "Gegenstand und Defekt scharf und nah — ohne unnötigen Hintergrund.",
  },
};

/** Welche Tipps zum Problem — leer = Bereich-Default. */
function tipKeysForProblem(
  bereichId: MeldeBereichId,
  problem: string
): TipKey[] {
  switch (bereichId) {
    case "wasser":
      if (
        problem === "laeuft" ||
        problem === "laeuft_stark" ||
        problem === "von_decke" ||
        problem === "von_oben" ||
        problem === "ueberschwemmt"
      ) {
        return ["wasser_nah", "wasser_uebersicht"];
      }
      return ["wasser_nah"];
    case "heizung":
      if (problem === "tropft_hk" || problem === "wasser_aus") {
        return ["heizung_hk", "wasser_nah"];
      }
      if (problem === "kein_ww") return ["heizung_hk"];
      return ["heizung_hk"];
    case "strom":
      if (problem === "kein_strom" || problem === "fi_sicherung") {
        return ["strom_kasten"];
      }
      if (problem === "steckdose" || problem === "licht" || problem === "schalter") {
        return ["strom_steckdose"];
      }
      if (problem === "garagentor") return ["sonstiges"];
      if (problem === "klingel") return ["sonstiges"];
      return ["strom_steckdose", "strom_kasten"];
    case "fenster_tuer":
      if (
        problem === "tuer_problem" ||
        problem === "tuer_klemmt" ||
        problem === "schloss"
      ) {
        return ["fenster_tuer", "fenster_schloss"];
      }
      if (problem === "scheibe_kaputt" || problem === "glas") {
        return ["fenster_rahmen"];
      }
      return ["fenster_rahmen"];
    case "dach":
      if (
        problem === "regenrinne_ueber" ||
        problem === "wasser_fassade" ||
        problem === "rinne" ||
        problem === "fallrohr"
      ) {
        return ["dach_rinne"];
      }
      if (problem === "ziegel_boden" || problem === "ziegel") {
        return ["sonstiges"];
      }
      return ["dach_rinne"];
    case "schimmel":
      if (problem === "fassade" || problem === "graffiti") {
        return ["schimmel_uebersicht", "schimmel_nah"];
      }
      if (problem === "grossflaechig") {
        return ["schimmel_nah", "schimmel_uebersicht"];
      }
      return ["schimmel_nah"];
    case "baum_notfall":
      return ["sonstiges"];
    case "sonstiges":
      if (problem === "wespen" || problem === "ungeziefer") {
        return ["sonstiges"];
      }
      if (
        problem === "muell" ||
        problem === "treppenhaus_schmutz" ||
        problem === "gemeinschaft"
      ) {
        return ["sonstiges"];
      }
      return ["sonstiges"];
    default:
      return ["sonstiges"];
  }
}

/** 1–2 passende Beispielfotos für Upload-Step. */
export function getMeldeFotoBeispiele(
  bereichFunnelValue: string | null | undefined,
  fachdetailAnswers?: Record<string, string | string[] | undefined>
): MeldeFotoBeispiel[] {
  const bereichId = kaputtBereichToMeldeId(bereichFunnelValue ?? "sonstiges");
  const problem = meldeProblemId(fachdetailAnswers);
  const keys = tipKeysForProblem(bereichId, problem);
  const seen = new Set<string>();
  const out: MeldeFotoBeispiel[] = [];
  for (const k of keys) {
    const tip = TIPS[k];
    if (seen.has(tip.src + tip.label)) continue;
    seen.add(tip.src + tip.label);
    out.push(tip);
  }
  return out.length ? out : [TIPS.sonstiges];
}

/** @deprecated Einzelbeispiel — nutze getMeldeFotoBeispiele */
export function getMeldeFotoBeispielForFunnelBereich(
  bereich: string | null | undefined
): MeldeFotoBeispiel {
  return getMeldeFotoBeispiele(bereich)[0] ?? TIPS.sonstiges;
}
