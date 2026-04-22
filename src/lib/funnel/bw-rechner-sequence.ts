import type { FunnelState, FunnelStep, Situation } from "@/lib/funnel/types";
import { getKundentypStep, getResolvedStepsForSituation } from "@/lib/funnel/config";
import { getBwResultModus } from "@/lib/funnel/price-calc";
import {
  fachdetailQuestionScreenId,
  getActiveFachdetailQuestionIds,
  isFachdetailQuestionScreen,
} from "@/lib/funnel/fachdetail-questions-flat";

/** Einzel-Screen pro Fachdetail-Frage */
export type FachdetailQuestionScreenId = `fachdetail_${string}`;

export function isBwFachdetailQuestionScreenId(
  step: string
): step is FachdetailQuestionScreenId {
  return isFachdetailQuestionScreen(step);
}

/** @deprecated Altes Präfix `fachdetails_<gewerk>` — nur noch für Migrationstests */
export function isBwFachdetailScreenId(step: string): boolean {
  return step.startsWith("fachdetails_");
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
  if (situation === "gewerbe") {
    return false;
  }
  if (
    situation === "kaputt" ||
    situation === "neubauen" ||
    situation === "betreuung"
  ) {
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

  /** Gewerbe: keine Bereiche — direkt zur B2B-Anfrage */
  if (sit === "gewerbe") {
    return ["situation", "beratung-lead"];
  }

  const steps = getResolvedStepsForSituation(
    sit,
    state.bereiche,
    state.fachdetails,
    state.umfang,
    getBwResultModus(state) === "zu_komplex"
  );

  const out: string[] = [];
  if (showTrustScreen("trust_intro", sit)) {
    out.push("trust_intro");
  }
  out.push("situation", "bereiche");

  for (let i = 1; i < steps.length; i++) {
    out.push(...funnelConfigStepToScreens(steps[i]!, state));
  }

  if (showTrustScreen("trust_preis", sit)) {
    const umfangIdx = out.lastIndexOf("umfang");
    if (umfangIdx >= 0) {
      out.splice(umfangIdx + 1, 0, "trust_preis");
    }
  }

  if (showTrustScreen("trust_qualitaet", sit)) {
    const fachIds = out.filter((s) => isBwFachdetailQuestionScreenId(s));
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
  state: FunnelState
): string[] {
  if (step.id === "fachdetails") {
    return getActiveFachdetailQuestionIds(state).map((id) =>
      fachdetailQuestionScreenId(id)
    );
  }
  if (step.id === "zugaenglichkeit") return ["zugaenglichkeit"];
  if (step.id === "zustand") return ["zustand"];
  if (step.id === "bad_ausstattung") return ["bad_ausstattung"];
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

export function firstFachdetailQuestionScreenId(
  state: Pick<FunnelState, "situation" | "bereiche" | "fachdetails">
): FachdetailQuestionScreenId | null {
  const ids = getActiveFachdetailQuestionIds(state);
  if (ids.length === 0) return null;
  return fachdetailQuestionScreenId(ids[0]!) as FachdetailQuestionScreenId;
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
