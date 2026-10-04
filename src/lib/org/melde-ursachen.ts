/**
 * Gemeinsame Ursachen-Card — alle Melde-Bereiche inkl. Müll/Treppenhaus/Wespen.
 */

import type { MeldeAnswers } from "@/lib/funnel/melde-dynamic-questions";
import {
  isBaumMeldeContext,type BaumUrsacheId,type MeldeUrsachenBaumState
} from "@/lib/org/melde-ursachen-baum";
import {
  dachSchadenKurz,isDachMeldeContext,type DachUrsacheId,type MeldeUrsachenDachState
} from "@/lib/org/melde-ursachen-dach";
import {
  fensterSchadenKurz,isFensterMeldeContext,type FensterUrsacheId,type MeldeUrsachenFensterState
} from "@/lib/org/melde-ursachen-fenster";
import {
  heizungSchadenKurz,isHeizungMeldeContext,type HeizungUrsacheId,type MeldeUrsachenHeizungState
} from "@/lib/org/melde-ursachen-heizung";
import {
  isSchimmelMeldeContext,
  schimmelSchadenKurz,type MeldeUrsachenSchimmelState,
  type SchimmelUrsacheId
} from "@/lib/org/melde-ursachen-schimmel";
import {
  isSonstigesMeldeContext,
  sonstigesSchadenKurz,type MeldeUrsachenSonstigesState,
  type SonstigesUrsacheId
} from "@/lib/org/melde-ursachen-sonstiges";
import {
  isStromMeldeContext,
  stromSchadenKurz,type MeldeUrsachenStromState,
  type StromUrsacheId
} from "@/lib/org/melde-ursachen-strom";
import {
  isWasserMeldeContext,
  wasserSchadenKurz,type MeldeUrsachenCheckState as WasserUrsachenState,
  type WasserUrsacheId
} from "@/lib/org/melde-ursachen-wasser";

export type MeldeUrsachenBereich =
  | "wasser"
  | "heizung"
  | "strom"
  | "fenster_tuer"
  | "dach"
  | "baum_notfall"
  | "schimmel"
  | "sonstiges";

export type MeldeUrsachenEntscheidung = "hm_geloest" | "fachfirma";

export type MeldeUrsachenCheckState =
  | WasserUrsachenState
  | MeldeUrsachenHeizungState
  | MeldeUrsachenStromState
  | MeldeUrsachenFensterState
  | MeldeUrsachenDachState
  | MeldeUrsachenBaumState
  | MeldeUrsachenSchimmelState
  | MeldeUrsachenSonstigesState;

export function parseMeldeUrsachenCheck(
  funnelDaten: unknown
): MeldeUrsachenCheckState | null {
  if (!funnelDaten || typeof funnelDaten !== "object") return null;
  const raw = (funnelDaten as Record<string, unknown>).ursachen_check;
  if (!raw || typeof raw !== "object") return null;
  const u = raw as Record<string, unknown>;
  const entscheidung =
    u.entscheidung === "hm_geloest" || u.entscheidung === "fachfirma"
      ? u.entscheidung
      : null;
  const base = {
    selectedUrsacheId: (u.selectedUrsacheId as string) ?? null,
    sonstigesText: (u.sonstigesText as string) ?? null,
    entscheidung,
    material: Array.isArray(u.material)
      ? u.material.map(String)
      : undefined,
    updatedAt: (u.updatedAt as string) ?? null,
  };
  if (u.bereich === "wasser") {
    return {
      bereich: "wasser",
      selectedUrsacheId: base.selectedUrsacheId as WasserUrsacheId | null,
      sonstigesText: base.sonstigesText,
      entscheidung,
      material: base.material,
      updatedAt: base.updatedAt,
    };
  }
  if (u.bereich === "heizung") {
    return {
      bereich: "heizung",
      selectedUrsacheId: base.selectedUrsacheId as HeizungUrsacheId | null,
      sonstigesText: base.sonstigesText,
      entscheidung,
      material: base.material,
      updatedAt: base.updatedAt,
    };
  }
  if (u.bereich === "strom") {
    return {
      bereich: "strom",
      selectedUrsacheId: base.selectedUrsacheId as StromUrsacheId | null,
      sonstigesText: base.sonstigesText,
      entscheidung,
      material: base.material,
      updatedAt: base.updatedAt,
    };
  }
  if (u.bereich === "fenster_tuer") {
    return {
      bereich: "fenster_tuer",
      selectedUrsacheId: base.selectedUrsacheId as FensterUrsacheId | null,
      sonstigesText: base.sonstigesText,
      entscheidung,
      material: base.material,
      updatedAt: base.updatedAt,
    };
  }
  if (u.bereich === "dach") {
    return {
      bereich: "dach",
      selectedUrsacheId: base.selectedUrsacheId as DachUrsacheId | null,
      sonstigesText: base.sonstigesText,
      entscheidung,
      material: base.material,
      updatedAt: base.updatedAt,
    };
  }
  if (u.bereich === "baum_notfall") {
    return {
      bereich: "baum_notfall",
      selectedUrsacheId: base.selectedUrsacheId as BaumUrsacheId | null,
      sonstigesText: base.sonstigesText,
      entscheidung,
      material: base.material,
      updatedAt: base.updatedAt,
    };
  }
  if (u.bereich === "schimmel") {
    return {
      bereich: "schimmel",
      selectedUrsacheId: base.selectedUrsacheId as SchimmelUrsacheId | null,
      sonstigesText: base.sonstigesText,
      entscheidung,
      material: base.material,
      updatedAt: base.updatedAt,
    };
  }
  if (u.bereich === "sonstiges") {
    return {
      bereich: "sonstiges",
      selectedUrsacheId: base.selectedUrsacheId as SonstigesUrsacheId | null,
      sonstigesText: base.sonstigesText,
      entscheidung,
      material: base.material,
      updatedAt: base.updatedAt,
    };
  }
  return null;
}

export function resolveMeldeUrsachenBereich(opts: {
  answers?: MeldeAnswers | null;
  bereichLabel?: string | null;
  bereiche?: string[] | null;
  ursachen?: MeldeUrsachenCheckState | null;
}): MeldeUrsachenBereich | null {
  if (opts.ursachen?.bereich === "wasser") return "wasser";
  if (opts.ursachen?.bereich === "heizung") return "heizung";
  if (opts.ursachen?.bereich === "strom") return "strom";
  if (opts.ursachen?.bereich === "fenster_tuer") return "fenster_tuer";
  if (opts.ursachen?.bereich === "dach") return "dach";
  if (opts.ursachen?.bereich === "baum_notfall") return "sonstiges";
  if (opts.ursachen?.bereich === "schimmel") return "schimmel";
  if (opts.ursachen?.bereich === "sonstiges") return "sonstiges";

  const answerOnly = {
    answers: opts.answers,
    bereichLabel: null as string | null,
    bereiche: null as string[] | null,
  };
  if (isSchimmelMeldeContext(answerOnly)) return "schimmel";
  if (isBaumMeldeContext(answerOnly)) return "sonstiges";
  if (isDachMeldeContext(answerOnly)) return "dach";
  if (isFensterMeldeContext(answerOnly)) return "fenster_tuer";
  if (isStromMeldeContext(answerOnly)) return "strom";
  if (isHeizungMeldeContext(answerOnly)) return "heizung";
  if (
    isWasserMeldeContext({
      ...answerOnly,
      ursachen: null,
    })
  ) {
    return "wasser";
  }
  if (isSonstigesMeldeContext(answerOnly)) return "sonstiges";

  const withLabel = {
    answers: opts.answers,
    bereichLabel: opts.bereichLabel,
    bereiche: opts.bereiche,
    // Nach Exhaustion der bekannten bereich-Werte: kein gespeicherter Match mehr.
    ursachenBereich: null as string | null,
  };
  if (isSchimmelMeldeContext(withLabel)) return "schimmel";
  if (isBaumMeldeContext(withLabel)) return "sonstiges";
  if (isDachMeldeContext(withLabel)) return "dach";
  if (isFensterMeldeContext(withLabel)) return "fenster_tuer";
  if (isStromMeldeContext(withLabel)) return "strom";
  if (isHeizungMeldeContext(withLabel)) return "heizung";
  if (
    isWasserMeldeContext({
      answers: opts.answers,
      bereichLabel: opts.bereichLabel,
      bereiche: opts.bereiche,
      ursachen: null,
    })
  ) {
    return "wasser";
  }
  if (isSonstigesMeldeContext(withLabel)) return "sonstiges";
  return null;
}

export function meldeSchadenKurz(
  bereich: MeldeUrsachenBereich,
  answers: MeldeAnswers | undefined
): string {
  if (bereich === "heizung") return heizungSchadenKurz(answers);
  if (bereich === "strom") return stromSchadenKurz(answers);
  if (bereich === "fenster_tuer") return fensterSchadenKurz(answers);
  if (bereich === "dach") return dachSchadenKurz(answers);
  if (bereich === "baum_notfall") return sonstigesSchadenKurz(answers);
  if (bereich === "schimmel") return schimmelSchadenKurz(answers);
  if (bereich === "sonstiges") return sonstigesSchadenKurz(answers);
  return wasserSchadenKurz(answers);
}

export type {
  WasserUrsacheId,
  HeizungUrsacheId,
  StromUrsacheId,
  FensterUrsacheId,
  DachUrsacheId,
  BaumUrsacheId,
  SchimmelUrsacheId,
  SonstigesUrsacheId,
};
