/**
 * Flache Fachdetail-Fragen: jede Frage = eigener globaler Screen `fachdetail_<id>`.
 * showWenn(state) inkl. Folgefragen (liest fachdetailAnswers).
 */

import { FACHDETAILS_NOTFALL } from "@/lib/funnel/fachdetails-notfall";
import {
  BODEN_FOLLOWUPS,
  BODEN_Q1,
  BODEN_ZUSTAND_Q,
  DACH_FOLLOWUPS,
  DACH_Q1,
  ELEKTRO_FOLLOWUPS,
  ELEKTRO_ERNEUERN_Q1,
  ELEKTRO_KAPUTT_Q1,
  FENSTER_DEFEKT_Q1,
  FENSTER_Q1,
  GARTEN_FOLLOWUPS,
  GARTEN_Q1,
  getElektroQ1ForSituation,
  HEIZUNG_FOLLOWUPS,
  HEIZUNG_HEIZKOERPER_ANZAHL,
  HEIZUNG_KAPUTT_Q1,
  FASSADE_ART_Q1,
  HEIZUNG_Q1_ERNEUERN,
  MALER_FOLLOWUPS,
  MALER_Q1,
  SANITAER_BAD_OBJEKT_LISTE,
  SANITAER_BAD_Q,
  SANITAER_FOLLOWUPS,
  SANITAER_Q1,
  type FachdetailQuestionDef,
} from "@/lib/funnel/fachdetails-questions";
import { sanitaerShortDone } from "@/lib/funnel/fachdetails-internal-order";
import type { FunnelState } from "@/lib/funnel/types";

/** Minimale State-Sicht für Fachdetail-Filter (kein vollständiges `FunnelState` nötig). */
export type FachdetailFilterState = Pick<
  FunnelState,
  "bereiche" | "situation" | "fachdetails"
>;

export type FachdetailOption = {
  value: string;
  label: string;
  hint?: string;
  emoji?: string;
  direktKomplex?: boolean;
  komplex_text?: string;
};

export type FachdetailQuestion = {
  id: string;
  gewerk: string;
  frage: string;
  subtext?: string;
  optionen: FachdetailOption[];
  showWenn: (state: FachdetailFilterState) => boolean;
  required: true;
  inputType?: "single" | "multi";
};

export function fachdetailAnswer(
  s: FachdetailFilterState,
  id: string
): string | string[] | undefined {
  return s.fachdetails?.fachdetailAnswers?.[id];
}

function ansStr(s: FachdetailFilterState, id: string): string | undefined {
  const v = fachdetailAnswer(s, id);
  return typeof v === "string" ? v : undefined;
}

function fromDef(
  id: string,
  gewerk: string,
  def: FachdetailQuestionDef,
  showWenn: (state: FachdetailFilterState) => boolean,
  opts?: Partial<FachdetailQuestion>
): FachdetailQuestion {
  return {
    id,
    gewerk,
    frage: def.title,
    subtext: def.education,
    optionen: def.options.map((o) => ({
      value: o.value,
      label: o.label,
      hint: o.hint,
      emoji: o.emoji,
      direktKomplex: o.direktKomplex,
      komplex_text: o.komplex_text,
    })),
    showWenn,
    required: true,
    inputType: def.inputType === "multi" ? "multi" : "single",
    ...opts,
  };
}

const B = (s: FachdetailFilterState) => new Set(s.bereiche);
const needSan = (s: FachdetailFilterState) => {
  const b = B(s);
  return (
    b.has("bad") ||
    b.has("wasser") ||
    b.has("sanitaer") ||
    b.has("feuchtigkeit_schimmel")
  );
};
const needEl = (s: FachdetailFilterState) => {
  const b = B(s);
  return b.has("strom") || b.has("elektrik") || b.has("elektro");
};

function elektroProblem(s: FachdetailFilterState): string | undefined {
  if (s.situation === "erneuern") return ansStr(s, "elektro_erneuern");
  if (s.situation === "kaputt") return ansStr(s, "elektro_kaputt");
  return undefined;
}

function elektroFollowShow(s: FachdetailFilterState, fid: string): boolean {
  if (!needEl(s)) return false;
  if (s.situation !== "kaputt" && s.situation !== "erneuern") return false;
  const p = elektroProblem(s);
  if (!p) return false;
  const q1 = getElektroQ1ForSituation(s.situation);
  const opt = q1.options.find((o) => o.value === p);
  return opt?.followUpId === fid;
}

function bodenFollowDef(m: string | undefined): FachdetailQuestionDef | null {
  if (!m) return null;
  const opt = BODEN_Q1.options.find((o) => o.value === m);
  const id = opt?.followUpId;
  if (!id) return null;
  return BODEN_FOLLOWUPS[id] ?? null;
}

export const FACHDETAIL_QUESTIONS: FachdetailQuestion[] = [
  fromDef(
    "bad_was",
    "sanitaer",
    SANITAER_BAD_Q,
    (s) =>
      s.situation === "erneuern" &&
      s.bereiche.includes("bad") &&
      needSan(s)
  ),
  fromDef(
    "bad_objekt_liste",
    "sanitaer",
    SANITAER_BAD_OBJEKT_LISTE,
    (s) =>
      s.situation === "erneuern" &&
      s.bereiche.includes("bad") &&
      needSan(s) &&
      (ansStr(s, "bad_was") === "objekte" ||
        ansStr(s, "bad_was") === "sanitaer"),
    { inputType: "multi" }
  ),
  fromDef(
    "sanitaer_lage",
    "sanitaer",
    SANITAER_Q1,
    (s) => {
      if (!needSan(s) || s.situation === "notfall") return false;
      const hasBad = s.bereiche.includes("bad");
      const bw = ansStr(s, "bad_was");
      const san = s.fachdetails?.sanitaer;
      if (hasBad && s.situation === "erneuern") {
        if (!bw) return false;
        if (
          (bw === "objekte" || bw === "sanitaer") &&
          fachdetailAnswer(s, "bad_objekt_liste") === undefined &&
          san?.objektListe === undefined
        ) {
          return false;
        }
        if (san && sanitaerShortDone(s.bereiche, s.situation, san))
          return false;
        if (bw === "wanne_dusche") return false;
      }
      return true;
    }
  ),
  fromDef(
    "sanitaer_rohre",
    "sanitaer",
    SANITAER_FOLLOWUPS.sanitaer_folge_rohre,
    (s) =>
      needSan(s) &&
      s.situation !== "notfall" &&
      ansStr(s, "sanitaer_lage") === "wand"
  ),
  fromDef(
    "sanitaer_notfall",
    "sanitaer",
    FACHDETAILS_NOTFALL.sanitaer,
    (s) => s.situation === "notfall" && needSan(s)
  ),
  fromDef(
    "sanitaer_problem",
    "sanitaer",
    {
      id: "sanitaer_problem",
      title: "Wo sitzt das Problem?",
      inputType: "single",
      options: [
        {
          value: "sichtbar",
          label: "Sichtbar zugänglich",
          hint: "Unter Waschbecken, Spüle oder Dusche",
        },
        {
          value: "wand",
          label: "Hinter der Wand",
          hint: "Unterputz-Leitung",
        },
        {
          value: "keller",
          label: "Am Haupthahn / im Keller",
          hint: "Hauptabsperrung",
        },
      ],
    },
    (s) =>
      s.situation === "kaputt" &&
      needSan(s) &&
      !s.bereiche.includes("bad")
  ),

  fromDef(
    "elektro_notfall",
    "elektro",
    FACHDETAILS_NOTFALL.elektro,
    (s) => s.situation === "notfall" && needEl(s)
  ),
  fromDef(
    "elektro_erneuern",
    "elektro",
    ELEKTRO_ERNEUERN_Q1,
    (s) => s.situation === "erneuern" && needEl(s)
  ),
  fromDef(
    "elektro_kaputt",
    "elektro",
    ELEKTRO_KAPUTT_Q1,
    (s) => s.situation === "kaputt" && needEl(s)
  ),
  fromDef(
    "elektro_folge_sicherung",
    "elektro",
    ELEKTRO_FOLLOWUPS.elektro_folge_sicherung,
    (s) => elektroFollowShow(s, "elektro_folge_sicherung")
  ),
  fromDef(
    "elektro_folge_steckdose",
    "elektro",
    ELEKTRO_FOLLOWUPS.elektro_folge_steckdose,
    (s) => elektroFollowShow(s, "elektro_folge_steckdose")
  ),
  fromDef(
    "elektro_folge_leitungen",
    "elektro",
    ELEKTRO_FOLLOWUPS.elektro_folge_leitungen,
    (s) => elektroFollowShow(s, "elektro_folge_leitungen")
  ),

  fromDef(
    "heizung_notfall",
    "heizung",
    FACHDETAILS_NOTFALL.heizung,
    (s) => s.situation === "notfall" && B(s).has("heizung")
  ),
  fromDef(
    "heizung_erneuern",
    "heizung",
    HEIZUNG_Q1_ERNEUERN,
    (s) => s.situation === "erneuern" && B(s).has("heizung")
  ),
  fromDef(
    "heizung_heizkoerper_anzahl",
    "heizung",
    HEIZUNG_HEIZKOERPER_ANZAHL,
    (s) =>
      s.situation === "erneuern" &&
      B(s).has("heizung") &&
      ansStr(s, "heizung_erneuern") === "heizkoerper"
  ),
  fromDef(
    "heizung_oel_alter",
    "heizung",
    HEIZUNG_FOLLOWUPS.heizung_folge_oel_alter,
    (s) =>
      s.situation === "erneuern" &&
      B(s).has("heizung") &&
      ansStr(s, "heizung_erneuern") === "oel"
  ),
  fromDef(
    "heizung_kaputt",
    "heizung",
    HEIZUNG_KAPUTT_Q1,
    (s) => s.situation === "kaputt" && B(s).has("heizung")
  ),

  fromDef(
    "fassade_art",
    "fassade",
    FASSADE_ART_Q1,
    (s) => {
      const b = B(s);
      return (
        b.has("fassade") || ansStr(s, "maler_was") === "fassade"
      );
    }
  ),

  fromDef(
    "maler_was",
    "maler",
    MALER_Q1,
    (s) => {
      const b = B(s);
      return (
        b.has("maler") ||
        b.has("streichen") ||
        b.has("waende") ||
        b.has("waende_boeden") ||
        b.has("feuchtigkeit_schimmel")
      );
    }
  ),
  fromDef(
    "maler_zustand",
    "maler",
    MALER_FOLLOWUPS.maler_folge_zustand,
    (s) => {
      const w = ansStr(s, "maler_was");
      return w === "waende_decke" || w === "komplett";
    }
  ),

  fromDef(
    "boden_material",
    "boden",
    BODEN_Q1,
    (s) => B(s).has("boden") || B(s).has("waende_boeden")
  ),
  fromDef(
    "boden_zustand",
    "boden",
    BODEN_ZUSTAND_Q,
    (s) => {
      const m = ansStr(s, "boden_material");
      const bodenish = B(s).has("boden") || B(s).has("waende_boeden");
      return Boolean(
        bodenish &&
          (m === "fliesen" || m === "laminat" || m === "parkett")
      );
    }
  ),
  {
    id: "boden_verlegung",
    gewerk: "boden",
    frage: "",
    optionen: [],
    showWenn: (s) => {
      const m = ansStr(s, "boden_material");
      const z = ansStr(s, "boden_zustand");
      return Boolean(
        (B(s).has("boden") || B(s).has("waende_boeden")) &&
          bodenFollowDef(m) &&
          z === "muss_komplett_raus"
      );
    },
    required: true,
  },

  fromDef(
    "dach_vorhaben",
    "dach",
    DACH_Q1,
    (s) => B(s).has("dach")
  ),
  fromDef(
    "dach_alter",
    "dach",
    DACH_FOLLOWUPS.dach_folge_alter,
    (s) => {
      const v = ansStr(s, "dach_vorhaben");
      return (
        B(s).has("dach") && (v === "daemmung" || v === "komplett")
      );
    }
  ),

  fromDef(
    "fenster_erneuern",
    "fenster",
    FENSTER_Q1,
    (s) =>
      B(s).has("fenster") ||
      B(s).has("fenster_tueren") ||
      (B(s).has("fenster_tuer") &&
        !(s.situation === "kaputt" && !B(s).has("fenster")))
  ),
  fromDef(
    "fenster_defekt",
    "fenster",
    FENSTER_DEFEKT_Q1,
    (s) =>
      s.situation === "kaputt" &&
      B(s).has("fenster_tuer") &&
      !B(s).has("fenster")
  ),

  fromDef(
    "garten_was",
    "garten",
    GARTEN_Q1,
    (s) =>
      B(s).has("garten") ||
      B(s).has("baum") ||
      B(s).has("baumarbeiten")
  ),
];

export function resolveGartenFollowupDef(
  state: FachdetailFilterState
): FachdetailQuestionDef | null {
  const w = ansStr(state, "garten_was");
  if (!w) return null;
  const opt = GARTEN_Q1.options.find((o) => o.value === w);
  const fid = opt?.followUpId;
  if (!fid) return null;
  return GARTEN_FOLLOWUPS[fid] ?? null;
}

/** Materialisiert boden_verlegung (dynamische Frage aus BODEN_Q1-Followup). */
export function materializeBodenVerlegung(
  state: FachdetailFilterState
): FachdetailQuestion | null {
  const def = bodenFollowDef(ansStr(state, "boden_material"));
  if (!def) return null;
  return fromDef("boden_verlegung", "boden", def, () => true);
}

/** UI + Footer: echte Frage mit Optionen — nicht den Platzhalter in {@link FACHDETAIL_QUESTIONS}. */
export function resolveFachdetailQuestionForUi(
  state: FachdetailFilterState,
  questionId: string
): FachdetailQuestion | null {
  if (questionId === "boden_verlegung") {
    return materializeBodenVerlegung(state);
  }
  if (questionId === "garten_followup") {
    const g = resolveGartenFollowupDef(state);
    if (!g) return null;
    const b =
      B(state).has("garten") ||
      B(state).has("baum") ||
      B(state).has("baumarbeiten");
    if (!b || !ansStr(state, "garten_was")) return null;
    return fromDef("garten_followup", "garten", g, () => true, {
      id: "garten_followup",
    });
  }
  return FACHDETAIL_QUESTIONS.find((q) => q.id === questionId) ?? null;
}

/** Aktive Fragen in fester Reihenfolge (inkl. dynamischer Garten-Followup). */
export function getActiveFachdetailQuestions(
  state: FachdetailFilterState
): FachdetailQuestion[] {
  const out: FachdetailQuestion[] = [];
  for (const q of FACHDETAIL_QUESTIONS) {
    if (q.id === "boden_verlegung") {
      const mat = materializeBodenVerlegung(state);
      if (mat && q.showWenn(state)) out.push(mat);
      continue;
    }
    if (q.showWenn(state)) out.push(q);
  }
  const g = resolveGartenFollowupDef(state);
  if (g) {
    const b =
      B(state).has("garten") ||
      B(state).has("baum") ||
      B(state).has("baumarbeiten");
    if (b && ansStr(state, "garten_was")) {
      out.push(
        fromDef("garten_followup", "garten", g, () => true, {
          id: "garten_followup",
        })
      );
    }
  }
  return out;
}

export function getActiveFachdetailQuestionIds(
  state: FachdetailFilterState
): string[] {
  return getActiveFachdetailQuestions(state).map((q) => q.id);
}

/** Alle aktuell sichtbaren Fachdetail-Fragen haben eine gültige Antwort. */
export function isFlatFachdetailsBlockComplete(
  state: FachdetailFilterState
): boolean {
  for (const q of getActiveFachdetailQuestions(state)) {
    const v = fachdetailAnswer(state, q.id);
    if (q.inputType === "multi") {
      const n = Array.isArray(v)
        ? v.length
        : typeof v === "string" && v
          ? v.split(",").filter(Boolean).length
          : 0;
      if (n === 0) return false;
    } else if (v === undefined || v === "") {
      return false;
    }
  }
  return true;
}

export function fachdetailQuestionScreenId(id: string): string {
  return `fachdetail_${id}`;
}

export function isFachdetailQuestionScreen(step: string): boolean {
  return step.startsWith("fachdetail_");
}

export function getFachdetailQuestionIdFromScreen(step: string): string | null {
  if (!isFachdetailQuestionScreen(step)) return null;
  return step.slice("fachdetail_".length);
}
