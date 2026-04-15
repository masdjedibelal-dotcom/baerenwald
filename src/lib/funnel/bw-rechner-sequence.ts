import type { FunnelState, FunnelStep } from "@/lib/funnel/types";
import { getKundentypStep, getResolvedStepsForSituation } from "@/lib/funnel/config";
import {
  getAktiveFachdetailGewerke,
  type FachdetailGewerkKey,
} from "@/lib/funnel/fachdetails-notfall";

/** Einzel-Screen pro Gewerk im Rechner */
export type FachdetailsScreenId = `fachdetails_${FachdetailGewerkKey}`;

export function isBwFachdetailScreenId(step: string): step is FachdetailsScreenId {
  return step.startsWith("fachdetails_");
}

export function getBwFachdetailGewerkFromScreen(
  step: string
): FachdetailGewerkKey | null {
  if (!isBwFachdetailScreenId(step)) return null;
  return step.slice("fachdetails_".length) as FachdetailGewerkKey;
}

/** Aufgelöste Rechner-Screens (ohne loading / result / lead / …) */
export function getBwRechnerScreenSequence(state: FunnelState): string[] {
  const sit = state.situation;
  if (!sit || sit === "gewerbe" || sit === "gastro") {
    return ["trust_intro", "situation", "bereiche"];
  }

  const steps = getResolvedStepsForSituation(
    sit,
    state.bereiche,
    state.fachdetails,
    state.umfang
  );

  const out: string[] = ["trust_intro", "situation", "bereiche"];

  for (let i = 1; i < steps.length; i++) {
    out.push(...funnelConfigStepToScreens(steps[i]!, state.bereiche));
  }

  const umfangIdx = out.lastIndexOf("umfang");
  if (umfangIdx >= 0) {
    out.splice(umfangIdx + 1, 0, "trust_preis");
  }

  let lastFachIdx = -1;
  for (let i = 0; i < out.length; i++) {
    if (isBwFachdetailScreenId(out[i]!)) lastFachIdx = i;
  }
  if (lastFachIdx >= 0) {
    out.splice(lastFachIdx + 1, 0, "trust_qualitaet");
  }

  const kt = getKundentypStep(sit);
  if (kt.options && kt.options.length > 0) {
    out.push("kundentyp");
  }
  out.push("ort");
  return out;
}

function funnelConfigStepToScreens(
  step: FunnelStep,
  bereiche: string[]
): string[] {
  if (step.id === "fachdetails") {
    return getAktiveFachdetailGewerke(bereiche, 2).map(
      (g) => `fachdetails_${g}` as FachdetailsScreenId
    );
  }
  if (step.id === "zugaenglichkeit") return ["zugaenglichkeit"];
  if (step.id === "zustand") return ["zustand"];
  if (step.id.toLowerCase().includes("groesse")) return ["groesse"];
  if (
    step.id.endsWith("_umfang") ||
    step.id === "notfall_dringlichkeit" ||
    step.id === "betreuung_haeufigkeit" ||
    step.id === "neubauen_planung"
  ) {
    return ["umfang"];
  }
  return [];
}

export function firstFachdetailsScreenId(
  bereiche: string[]
): FachdetailsScreenId | null {
  const a = getAktiveFachdetailGewerke(bereiche, 2);
  if (a.length === 0) return null;
  return `fachdetails_${a[0]}`;
}

export function getPreviousBwRechnerScreen(
  state: FunnelState,
  current: string
): string | null {
  const seq = getBwRechnerScreenSequence(state);
  const idx = seq.indexOf(current);
  if (idx <= 0) return null;
  return seq[idx - 1] ?? null;
}

export function getNextBwRechnerScreen(
  state: FunnelState,
  current: string
): string | null {
  const seq = getBwRechnerScreenSequence(state);
  const idx = seq.indexOf(current);
  if (idx < 0 || idx >= seq.length - 1) return null;
  return seq[idx + 1] ?? null;
}
