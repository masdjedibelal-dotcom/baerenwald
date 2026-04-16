import type { FunnelState, FunnelStep, Situation } from "@/lib/funnel/types";
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

export type BwTrustScreenVariant =
  | "trust_intro"
  | "trust_preis"
  | "trust_qualitaet";

/** Trust-Slides nur für passende Situationen (s. Produkt-Matrix). */
export function showTrustScreen(
  variant: BwTrustScreenVariant,
  situation: Situation | null
): boolean {
  if (!situation) {
    return variant === "trust_intro";
  }
  if (situation === "notfall") {
    return false;
  }
  if (situation === "gewerbe" || situation === "gastro") {
    return false;
  }
  if (situation === "betreuung" || situation === "neubauen") {
    return variant === "trust_intro" || variant === "trust_preis";
  }
  return true;
}

/** Aufgelöste Rechner-Screens (ohne loading / result / lead / …) */
export function getBwRechnerScreenSequence(state: FunnelState): string[] {
  const sit = state.situation;

  if (!sit) {
    const head: string[] = [];
    if (showTrustScreen("trust_intro", null)) {
      head.push("trust_intro");
    }
    head.push("situation", "bereiche");
    return head;
  }

  /** Gewerbe/Gastro: keine Bereiche — direkt zur B2B-Anfrage */
  if (sit === "gewerbe" || sit === "gastro") {
    return ["situation", "beratung-lead"];
  }

  const steps = getResolvedStepsForSituation(
    sit,
    state.bereiche,
    state.fachdetails,
    state.umfang
  );

  const out: string[] = [];
  if (showTrustScreen("trust_intro", sit)) {
    out.push("trust_intro");
  }
  out.push("situation", "bereiche");

  for (let i = 1; i < steps.length; i++) {
    out.push(...funnelConfigStepToScreens(steps[i]!, state.bereiche));
  }

  if (showTrustScreen("trust_preis", sit)) {
    const umfangIdx = out.lastIndexOf("umfang");
    if (umfangIdx >= 0) {
      out.splice(umfangIdx + 1, 0, "trust_preis");
    }
  }

  if (showTrustScreen("trust_qualitaet", sit)) {
    const fachIds = out.filter((s) => isBwFachdetailScreenId(s));
    const letztesFachdetail = fachIds[fachIds.length - 1];
    if (letztesFachdetail) {
      const idx = out.lastIndexOf(letztesFachdetail);
      if (idx >= 0) {
        out.splice(idx + 1, 0, "trust_qualitaet");
      }
    }
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
