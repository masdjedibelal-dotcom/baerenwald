"use client";

import { useCallback, useMemo, useReducer, useState } from "react";

import {
  applyStepAnswer,
  createInitialFunnelState,
  getVisibleSteps,
  syncDerivedFromAnswers,
} from "@/lib/funnel-config";
import { applyPricingToState } from "@/lib/price-calc";
import type {
  Dringlichkeit,
  FunnelState,
  Mode,
  PlzZeitraumAnswer,
  PriceLineItem,
  SelectedSlot,
  Situation,
  StepAnswerValue,
} from "@/lib/types";

export type FunnelAction =
  | { type: "SET_SITUATION"; situation: Situation }
  | { type: "SET_ANSWER"; stepId: string; value: StepAnswerValue }
  | { type: "SET_GEWERKE"; gewerke: string[] }
  | { type: "SET_FLAECHE"; flaeche: number }
  | { type: "SET_DRINGLICHKEIT"; dringlichkeit: Dringlichkeit | null }
  | { type: "SET_PLZ"; plz: string }
  | { type: "SET_ZEITRAUM"; zeitraum: string }
  | { type: "SET_PHOTOS"; photos: File[] }
  | {
      type: "SET_LEAD_FIELD";
      field:
        | "name"
        | "vorname"
        | "nachname"
        | "email"
        | "telefon"
        | "anmerkungen"
        | "plz";
      value: string;
    }
  | { type: "SET_SELECTED_SLOT"; slot: SelectedSlot | null }
  | { type: "SET_SKIP_CALENDAR"; value: boolean }
  | { type: "SET_BERATUNG"; value: boolean }
  | { type: "SET_ENTSCHEIDER"; value: boolean }
  | { type: "SET_B2B_PRIO"; value: string }
  | {
      type: "SET_PRICE";
      priceMin: number;
      priceMax: number;
      priceBreakdown: PriceLineItem[];
    }
  | { type: "RESET" };

function deriveModeFromGewerke(gewerke: string[]): Mode | null {
  if (gewerke.length === 0) return null;
  return gewerke.length > 1 ? "multi" : "single";
}

export function funnelReducer(
  state: FunnelState,
  action: FunnelAction
): FunnelState {
  switch (action.type) {
    case "RESET":
      return applyPricingToState(createInitialFunnelState());

    case "SET_SITUATION": {
      const next = { ...createInitialFunnelState(), situation: action.situation };
      return applyPricingToState(next);
    }

    case "SET_ANSWER":
      return applyStepAnswer(state, action.stepId, action.value);

    case "SET_GEWERKE": {
      const mode = deriveModeFromGewerke(action.gewerke);
      return applyPricingToState({
        ...state,
        gewerke: [...action.gewerke],
        mode,
      });
    }

    case "SET_FLAECHE":
      return applyPricingToState({ ...state, flaeche: action.flaeche });

    case "SET_DRINGLICHKEIT":
      return applyPricingToState({
        ...state,
        dringlichkeit: action.dringlichkeit,
      });

    case "SET_PLZ": {
      const prevShared = state.answers.shared_plz;
      const zeitraum =
        prevShared &&
        typeof prevShared === "object" &&
        "zeitraum" in prevShared
          ? String((prevShared as PlzZeitraumAnswer).zeitraum ?? "")
          : state.zeitraum;
      const shared: PlzZeitraumAnswer = {
        plz: action.plz,
        zeitraum,
      };
      const answers = { ...state.answers, shared_plz: shared };
      let next: FunnelState = {
        ...state,
        answers,
        plz: action.plz,
      };
      next = syncDerivedFromAnswers(next);
      return applyPricingToState(next);
    }

    case "SET_ZEITRAUM": {
      const prevShared = state.answers.shared_plz;
      const plz =
        prevShared &&
        typeof prevShared === "object" &&
        "plz" in prevShared
          ? String((prevShared as PlzZeitraumAnswer).plz ?? "")
          : state.plz;
      const shared: PlzZeitraumAnswer = {
        plz,
        zeitraum: action.zeitraum,
      };
      const answers = { ...state.answers, shared_plz: shared };
      let next: FunnelState = {
        ...state,
        answers,
        zeitraum: action.zeitraum,
      };
      next = syncDerivedFromAnswers(next);
      return applyPricingToState(next);
    }

    case "SET_PHOTOS":
      return { ...state, photos: [...action.photos] };

    case "SET_LEAD_FIELD": {
      const { field, value } = action;
      if (field === "plz") {
        return funnelReducer(state, { type: "SET_PLZ", plz: value });
      }
      const next = { ...state, [field]: value };
      if (field === "vorname" || field === "nachname") {
        next.name = `${next.vorname} ${next.nachname}`.trim();
      }
      return next;
    }

    case "SET_SELECTED_SLOT":
      return { ...state, selectedSlot: action.slot };

    case "SET_SKIP_CALENDAR":
      return {
        ...state,
        skipCalendar: action.value,
        selectedSlot: action.value ? null : state.selectedSlot,
      };

    case "SET_BERATUNG":
      return { ...state, beratung: action.value };

    case "SET_ENTSCHEIDER":
      return { ...state, entscheider: action.value };

    case "SET_B2B_PRIO":
      return { ...state, b2bPrio: action.value };

    case "SET_PRICE":
      return {
        ...state,
        priceMin: action.priceMin,
        priceMax: action.priceMax,
        priceBreakdown: action.priceBreakdown,
      };

  }
}

export function useFunnelState() {
  const [funnel, dispatch] = useReducer(funnelReducer, undefined, () =>
    applyPricingToState(createInitialFunnelState())
  );
  const [stepIndex, setStepIndex] = useState(0);

  const visibleSteps = useMemo(() => getVisibleSteps(funnel), [funnel]);
  const currentStep = visibleSteps[stepIndex] ?? null;

  const startSituation = useCallback((situation: Situation) => {
    dispatch({ type: "SET_SITUATION", situation });
    setStepIndex(0);
  }, []);

  const setAnswer = useCallback((stepId: string, value: StepAnswerValue) => {
    dispatch({ type: "SET_ANSWER", stepId, value });
  }, []);

  const nextStep = useCallback(() => {
    setStepIndex((i) =>
      Math.min(i + 1, Math.max(visibleSteps.length - 1, 0))
    );
  }, [visibleSteps.length]);

  const prevStep = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const goToStepIndex = useCallback(
    (index: number) => {
      setStepIndex(
        Math.max(0, Math.min(index, Math.max(visibleSteps.length - 1, 0)))
      );
    },
    [visibleSteps.length]
  );

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
    setStepIndex(0);
  }, []);

  const setLeadField = useCallback(
    (
      field: Extract<
        FunnelAction,
        { type: "SET_LEAD_FIELD" }
      >["field"],
      value: string
    ) => {
      dispatch({ type: "SET_LEAD_FIELD", field, value });
    },
    []
  );

  return useMemo(
    () => ({
      funnel,
      dispatch,
      stepIndex,
      setStepIndex,
      visibleSteps,
      currentStep,
      startSituation,
      setAnswer,
      setLeadField,
      nextStep,
      prevStep,
      goToStepIndex,
      reset,
    }),
    [
      funnel,
      stepIndex,
      visibleSteps,
      currentStep,
      startSituation,
      setAnswer,
      setLeadField,
      nextStep,
      prevStep,
      goToStepIndex,
      reset,
    ]
  );
}
