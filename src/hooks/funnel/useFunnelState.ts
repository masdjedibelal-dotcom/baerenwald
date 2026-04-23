"use client";

import { useCallback, useMemo, useReducer } from "react";

import { buildPatchClearFachdetailAnswer } from "@/lib/funnel/fachdetail-answer-sync";
import { mergeFachdetailsPatch } from "@/lib/funnel/fachdetails-merge";
import {
  countFachdetailGewerke,
  type FachdetailGewerkKey,
} from "@/lib/funnel/fachdetails-notfall";
import type {
  BudgetCheck,
  FachdetailsState,
  FunnelState,
  Kundentyp,
  NotfallDringlichkeit,
  ObjektZustand,
  PriceLineItem,
  Situation,
  Zeitraum,
  Zugaenglichkeit,
} from "@/lib/funnel/types";

export type BwFunnelAction =
  | { type: "SET_SITUATION"; situation: Situation }
  | { type: "SET_BEREICHE"; values: string[] }
  | { type: "TOGGLE_BEREICH"; value: string }
  | { type: "SET_UMFANG"; value: string | null; faktor: number }
  | { type: "SET_GROESSE"; n: number | null; einheit: "qm" | "stueck" | "meter" | null }
  | { type: "SET_PLZ"; plz: string }
  | { type: "SET_ZEITRAUM"; zeitraum: Zeitraum | null }
  | { type: "SET_ZUGAENGLICHKEIT"; value: Zugaenglichkeit | null }
  | { type: "SET_ZUSTAND"; value: ObjektZustand | null }
  | { type: "SET_FACHDETAILS"; patch: Partial<FachdetailsState> }
  | { type: "CLEAR_FACHDETAIL_ANSWER"; questionId: string }
  | { type: "RESET_FACHDETAIL"; gewerk: FachdetailGewerkKey }
  | {
      type: "SET_BAD_AUSSTATTUNG";
      value: "standard" | "komfort" | "gehoben" | null;
    }
  | { type: "SET_PHOTOS"; files: File[] }
  | {
      type: "UPDATE_LEAD_FIELD";
      field:
        | "name"
        | "email"
        | "telefon"
        | "vorname"
        | "nachname"
        | "leadBeschreibung"
        | "freitext";
      value: string;
    }
  | { type: "SET_SLOT"; date: string; time: string }
  | { type: "CLEAR_SLOT" }
  | {
      type: "SET_PRICE";
      min: number;
      max: number;
      breakdown: PriceLineItem[];
      istFallback?: boolean;
      komplexReason?: string | null;
    }
  | { type: "SET_BUDGET_CHECK"; value: BudgetCheck }
  /** Notfall: zweiter Schritt (Dringlichkeit) */
  | {
      type: "SET_DRINGLICHKEIT";
      value: NotfallDringlichkeit | null;
    }
  | { type: "SET_SUBMITTED"; value: boolean }
  | { type: "SET_KUNDENTYP"; value: Kundentyp | null }
  | { type: "RESET" };

/**
 * Vollständiger Default für den Bärenwald-Rechner.
 * Regel: Neue Keys in `FunnelState` entweder hier mit Default belegen **oder** in
 * `types.ts` als optional (`?`) markieren und an Lesestellen mit `??` absichern —
 * sonst riskieren Hydration/Partials und Netlify-Builds fehlende Felder.
 */
export const BW_FUNNEL_INITIAL_STATE: FunnelState = {
  situation: null,
  bereiche: [],
  kundentyp: null,
  showOmitHint: false,
  umfang: null,
  umfangFaktor: 1,
  groesse: null,
  groesseEinheit: null,
  badAusstattung: null,
  plz: "",
  zeitraum: null,
  priceMin: 0,
  priceMax: 0,
  breakdown: [],
  istFallback: false,
  komplexReason: null,
  budgetCheck: null,
  dringlichkeit: null,
  zugaenglichkeit: null,
  zustand: null,
  fachdetails: {},
  freitext: null,
  photos: [],
  name: "",
  vorname: "",
  nachname: "",
  leadBeschreibung: "",
  email: "",
  telefon: "",
  selectedSlot: null,
  submitted: false,
};

export function createInitialBwFunnelState(): FunnelState {
  return {
    ...BW_FUNNEL_INITIAL_STATE,
    bereiche: [],
    breakdown: [],
    fachdetails: {},
    photos: [],
    badAusstattung: null,
    showOmitHint: false,
  };
}

function bwFunnelReducer(
  state: FunnelState,
  action: BwFunnelAction
): FunnelState {
  switch (action.type) {
    case "RESET":
      return createInitialBwFunnelState();

    case "SET_SITUATION": {
      const next: FunnelState = {
        ...createInitialBwFunnelState(),
        situation: action.situation,
      };
      return next;
    }

    case "SET_BEREICHE": {
      const bereiche = [...action.values];
      return {
        ...state,
        bereiche,
        groesse: null,
        groesseEinheit: null,
        badAusstattung: null,
        zugaenglichkeit: null,
        zustand: null,
        fachdetails: {},
        showOmitHint: countFachdetailGewerke(bereiche) > 2,
      };
    }

    case "TOGGLE_BEREICH": {
      const set = new Set(state.bereiche);
      if (set.has(action.value)) set.delete(action.value);
      else set.add(action.value);
      const bereiche = Array.from(set);
      return {
        ...state,
        bereiche,
        groesse: null,
        groesseEinheit: null,
        badAusstattung: null,
        zugaenglichkeit: null,
        zustand: null,
        fachdetails: {},
        showOmitHint: countFachdetailGewerke(bereiche) > 2,
      };
    }

    case "SET_UMFANG":
      return {
        ...state,
        umfang: action.value,
        umfangFaktor: action.faktor,
        groesse: null,
        groesseEinheit: null,
        badAusstattung: null,
        zugaenglichkeit: null,
        zustand: null,
        fachdetails: {},
      };

    case "SET_GROESSE":
      return {
        ...state,
        groesse: action.n,
        groesseEinheit: action.einheit,
      };

    case "SET_PLZ":
      return { ...state, plz: action.plz };

    case "SET_ZEITRAUM":
      return { ...state, zeitraum: action.zeitraum };

    case "SET_ZUGAENGLICHKEIT":
      return {
        ...state,
        zugaenglichkeit: action.value,
        zustand: null,
      };

    case "SET_ZUSTAND":
      return { ...state, zustand: action.value };

    case "SET_BAD_AUSSTATTUNG":
      return { ...state, badAusstattung: action.value };

    case "RESET_FACHDETAIL": {
      const nextFd = { ...state.fachdetails } as FachdetailsState;
      delete (nextFd as Record<string, unknown>)[action.gewerk];
      return { ...state, fachdetails: nextFd };
    }

    case "SET_FACHDETAILS": {
      const p = action.patch;
      return {
        ...state,
        fachdetails: mergeFachdetailsPatch(state.fachdetails, p),
      };
    }

    case "CLEAR_FACHDETAIL_ANSWER": {
      const p = buildPatchClearFachdetailAnswer(
        state.fachdetails,
        action.questionId
      );
      return {
        ...state,
        fachdetails: mergeFachdetailsPatch(state.fachdetails, p),
      };
    }

    case "SET_PHOTOS":
      return { ...state, photos: [...action.files] };

    case "UPDATE_LEAD_FIELD": {
      const v =
        action.field === "freitext"
          ? action.value.trim() === ""
            ? null
            : action.value.trim().slice(0, 150)
          : action.value;
      const next = { ...state, [action.field]: v } as FunnelState;
      if (action.field === "vorname" || action.field === "nachname") {
        next.name = `${next.vorname} ${next.nachname}`.trim();
      }
      return next;
    }

    case "SET_SLOT":
      return {
        ...state,
        selectedSlot: { date: action.date, time: action.time },
      };

    case "CLEAR_SLOT":
      return { ...state, selectedSlot: null };

    case "SET_PRICE":
      return {
        ...state,
        priceMin: action.min,
        priceMax: action.max,
        breakdown: [...action.breakdown],
        istFallback: Boolean(action.istFallback),
        komplexReason:
          action.komplexReason !== undefined
            ? action.komplexReason
            : null,
      };

    case "SET_BUDGET_CHECK":
      return { ...state, budgetCheck: action.value };

    case "SET_DRINGLICHKEIT":
      return { ...state, dringlichkeit: action.value };

    case "SET_SUBMITTED":
      return { ...state, submitted: action.value };

    case "SET_KUNDENTYP":
      return { ...state, kundentyp: action.value };

    default:
      return state;
  }
}

export function useBwFunnelState() {
  const [state, dispatch] = useReducer(
    bwFunnelReducer,
    undefined,
    createInitialBwFunnelState
  );

  const setSituation = useCallback((s: Situation) => {
    dispatch({ type: "SET_SITUATION", situation: s });
  }, []);

  const setBereiche = useCallback((values: string[]) => {
    dispatch({ type: "SET_BEREICHE", values });
  }, []);

  const toggleBereich = useCallback((b: string) => {
    dispatch({ type: "TOGGLE_BEREICH", value: b });
  }, []);

  const setUmfang = useCallback((value: string | null, faktor: number) => {
    dispatch({ type: "SET_UMFANG", value, faktor });
  }, []);

  const setGroesse = useCallback(
    (
      n: number | null,
      einheit: "qm" | "stueck" | "meter" | null
    ) => {
      dispatch({ type: "SET_GROESSE", n, einheit });
    },
    []
  );

  const setPlz = useCallback((plz: string) => {
    dispatch({ type: "SET_PLZ", plz });
  }, []);

  const setZeitraum = useCallback((z: Zeitraum | null) => {
    dispatch({ type: "SET_ZEITRAUM", zeitraum: z });
  }, []);

  const setZugaenglichkeit = useCallback((value: Zugaenglichkeit | null) => {
    dispatch({ type: "SET_ZUGAENGLICHKEIT", value });
  }, []);

  const setZustand = useCallback((value: ObjektZustand | null) => {
    dispatch({ type: "SET_ZUSTAND", value });
  }, []);

  const setFachdetails = useCallback((patch: Partial<FachdetailsState>) => {
    dispatch({ type: "SET_FACHDETAILS", patch });
  }, []);

  const clearFachdetailAnswer = useCallback((questionId: string) => {
    dispatch({ type: "CLEAR_FACHDETAIL_ANSWER", questionId });
  }, []);

  const resetFachdetailsForGewerk = useCallback((gewerk: FachdetailGewerkKey) => {
    dispatch({ type: "RESET_FACHDETAIL", gewerk });
  }, []);

  const setBadAusstattung = useCallback(
    (value: "standard" | "komfort" | "gehoben" | null) => {
      dispatch({ type: "SET_BAD_AUSSTATTUNG", value });
    },
    []
  );

  const setPrice = useCallback(
    (
      min: number,
      max: number,
      breakdown: PriceLineItem[],
      istFallback?: boolean,
      komplexReason?: string | null
    ) => {
      dispatch({
        type: "SET_PRICE",
        min,
        max,
        breakdown,
        istFallback,
        komplexReason,
      });
    },
    []
  );

  const setBudgetCheck = useCallback((v: BudgetCheck) => {
    dispatch({ type: "SET_BUDGET_CHECK", value: v });
  }, []);

  const setSlot = useCallback((date: string, time: string) => {
    dispatch({ type: "SET_SLOT", date, time });
  }, []);

  const updateLeadField = useCallback((field: string, value: string) => {
    if (
      field !== "name" &&
      field !== "email" &&
      field !== "telefon" &&
      field !== "vorname" &&
      field !== "nachname" &&
      field !== "leadBeschreibung" &&
      field !== "freitext"
    ) {
      return;
    }
    dispatch({
      type: "UPDATE_LEAD_FIELD",
      field,
      value,
    });
  }, []);

  const addPhotos = useCallback((files: File[]) => {
    dispatch({ type: "SET_PHOTOS", files });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  const setDringlichkeit = useCallback(
    (value: NotfallDringlichkeit | null) => {
      dispatch({ type: "SET_DRINGLICHKEIT", value });
    },
    []
  );

  const setSubmitted = useCallback((value: boolean) => {
    dispatch({ type: "SET_SUBMITTED", value });
  }, []);

  const setKundentyp = useCallback((value: Kundentyp | null) => {
    dispatch({ type: "SET_KUNDENTYP", value });
  }, []);

  return useMemo(
    () => ({
      state,
      dispatch,
      setSituation,
      setBereiche,
      toggleBereich,
      setKundentyp,
      setUmfang,
      setGroesse,
      setPlz,
      setZeitraum,
      setZugaenglichkeit,
      setZustand,
      setFachdetails,
      clearFachdetailAnswer,
      resetFachdetailsForGewerk,
      setBadAusstattung,
      setPrice,
      setBudgetCheck,
      setSlot,
      updateLeadField,
      addPhotos,
      reset,
      setDringlichkeit,
      setSubmitted,
    }),
    [
      state,
      setSituation,
      setBereiche,
      toggleBereich,
      setKundentyp,
      setUmfang,
      setGroesse,
      setPlz,
      setZeitraum,
      setZugaenglichkeit,
      setZustand,
      setFachdetails,
      clearFachdetailAnswer,
      resetFachdetailsForGewerk,
      setBadAusstattung,
      setPrice,
      setBudgetCheck,
      setSlot,
      updateLeadField,
      addPhotos,
      reset,
      setDringlichkeit,
      setSubmitted,
    ]
  );
}

/** Alias für den Rechner-Controller */
export { useBwFunnelState as useFunnelState };

