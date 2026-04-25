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
  if (situation === "gewerbe") {
    return false;
  }
  if (situation === "kaputt" || situation === "betreuung") {
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
    const anchorIdx = Math.max(
      out.lastIndexOf("umfang"),
      out.lastIndexOf("zeitpunkt")
    );
    if (anchorIdx >= 0) {
      out.splice(anchorIdx + 1, 0, "trust_preis");
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
  /** Betreuung: kein Ort-/PLZ-Schritt — Start-Zeitraum wird ohne PLZ-Eingabe gesetzt (s. Rechner-Client). */
  if (sit !== "betreuung") {
    out.push("ort");
  }
  return out;
}

function funnelConfigStepToScreens(
  step: FunnelStep,
  state: FunnelState
): string[] {
  if (step.id === "fachdetails") {
    /** Leer z. B. bei Sanitär Kaputt + Lage `wand` (Leck hinter Wand) — dann folgt direkt `zeitpunkt`, s. {@link getActiveFachdetailQuestionIds}. */
    return getActiveFachdetailQuestionIds(state).map((id) =>
      fachdetailQuestionScreenId(id)
    );
  }
  if (step.id === "zugaenglichkeit") return ["zugaenglichkeit"];
  if (step.id === "zustand") return ["zustand"];
  if (step.id === "bad_ausstattung") return ["bad_ausstattung"];
  if (step.id === "projekt_terrasse_material") {
    return ["projekt_terrasse_material"];
  }
  if (step.id === "projekt_terrasse_unterbau") {
    return ["projekt_terrasse_unterbau"];
  }
  if (step.id === "projekt_durchbruch_anzahl") {
    return ["projekt_durchbruch_anzahl"];
  }
  if (step.id === "projekt_durchbruch_statik") {
    return ["projekt_durchbruch_statik"];
  }
  if (step.id === "projekt_garten_leistung") {
    return ["projekt_garten_leistung"];
  }
  if (step.id === "projekt_garten_zaun") return ["projekt_garten_zaun"];
  if (step.id === "projekt_garten_zugang") return ["projekt_garten_zugang"];
  if (step.id === "projekt_ausbau_rohbau") return ["projekt_ausbau_rohbau"];
  if (step.id === "projekt_ausbau_deckenhoehe") {
    return ["projekt_ausbau_deckenhoehe"];
  }
  if (step.id.toLowerCase().includes("groesse")) return ["groesse"];
  if (step.id === "kaputt_dringlichkeit") {
    return ["zeitpunkt"];
  }
  if (
    step.id.endsWith("_umfang") ||
    step.id === "betreuung_haeufigkeit"
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
  /** `lastIndexOf` wie im Rechner-Back: gleicher Screen-Id kann theoretisch doppelt vorkommen. */
  const idx = seq.lastIndexOf(current);
  if (idx <= 0) return null;
  return seq[idx - 1] ?? null;
}

export function getNextBwRechnerScreen(
  state: FunnelState,
  current: string
): string | null {
  const seq = getBwRechnerScreenSequence(state);
  /** Zu „Weiter“ nach dem aktuell sichtbaren Schritt (letzte Position bei Duplikaten). */
  const idx = seq.lastIndexOf(current);
  if (idx < 0 || idx >= seq.length - 1) return null;
  return seq[idx + 1] ?? null;
}

/**
 * Wenn der aktuelle Screen kein Nachfolger in der Sequenz hat (z. B. Fachdetail-Screens
 * fallen nach State-Update weg), nächster sichtbarer Schritt nach „bereiche“ ohne `fachdetail_*`.
 */
export function resolveNextBwRechnerScreenFromFachdetail(
  state: FunnelState,
  current: string
): string | null {
  const direct = getNextBwRechnerScreen(state, current);
  if (direct) return direct;
  if (!isBwFachdetailQuestionScreenId(current)) return null;
  const seq = getBwRechnerScreenSequence(state);
  const bi = seq.lastIndexOf("bereiche");
  const tail = bi >= 0 ? seq.slice(bi + 1) : seq;
  return tail.find((s) => !isBwFachdetailQuestionScreenId(s)) ?? null;
}
