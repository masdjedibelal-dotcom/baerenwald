import type { FunnelState, FunnelStep, PlzZeitraumAnswer } from "@/lib/types";

export function isPlzZeitraumValid(v: unknown): v is PlzZeitraumAnswer {
  if (!v || typeof v !== "object") return false;
  const o = v as PlzZeitraumAnswer;
  return (
    typeof o.plz === "string" &&
    /^\d{5}$/.test(o.plz.trim()) &&
    typeof o.zeitraum === "string" &&
    o.zeitraum.trim().length > 0
  );
}

/** Gültige Antwort für einen Schritt aus funnel-config (ohne Situationswahl). */
export function isConfigStepAnswerValid(
  state: FunnelState,
  step: FunnelStep
): boolean {
  const a = state.answers[step.id];

  switch (step.inputType) {
    case "tiles-single":
    case "chips-single":
      return typeof a === "string" && a.trim().length > 0;
    case "tiles-multi":
    case "chips-multi":
      return Array.isArray(a) && a.length > 0;
    case "slider": {
      if (typeof a !== "number" || !step.sliderConfig) return false;
      const { min, max } = step.sliderConfig;
      return a >= min && a <= max;
    }
    case "text":
      return typeof a === "string" && a.trim().length > 0;
    case "plz-zeitraum":
      return isPlzZeitraumValid(a);
    case "plz":
      return typeof a === "string" && /^\d{5}$/.test(a.trim());
    default:
      return false;
  }
}

export function isLeadStepValid(state: FunnelState): boolean {
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email.trim());
  return (
    state.vorname.trim().length > 0 &&
    state.nachname.trim().length > 0 &&
    emailOk &&
    state.telefon.trim().length >= 5 &&
    /^\d{5}$/.test(state.plz.trim())
  );
}
