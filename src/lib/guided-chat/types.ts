import type { KiParsedBekannt } from "@/lib/ki-rechner/types";
import type { Situation, Zeitraum } from "@/lib/funnel/types";
import type { BwCalculatePriceResult } from "@/lib/funnel/price-calc";
import type { GptVizPrepareQuestion } from "@/lib/gpt-viz/types";

export type GuidedJourney = "beraten" | "viz" | "preis" | "anfrage";

export type GuidedField =
  | "situation"
  | "bereich"
  | "fachdetail"
  | "groesse"
  | "plz"
  | "zeitraum";

export type GuidedDecisionLayout = "default" | "compact" | "chip";

export type GuidedFunnelDraft = {
  situation?: Situation;
  bereiche: string[];
  groesse?: number;
  groesseEinheit?: "qm" | "stueck" | "meter";
  plz?: string;
  zeitraum?: Zeitraum;
  kundentyp?: string;
  fachdetails?: {
    bad?: string;
    sanitaer?: { badWas?: string };
    [key: string]: string | { badWas?: string } | undefined;
  };
};

export type GuidedDecisionOption = {
  value: string;
  label: string;
  hint?: string;
  icon?: string;
  emoji?: string;
  tag?: string;
  tagType?: "multi" | "abo" | "notfall";
};

export type GptChatBlock =
  | { type: "journey_entry" }
  | {
      type: "decision";
      field: GuidedField | "journey";
      question?: string;
      hint?: string;
      options: GuidedDecisionOption[];
      multi?: boolean;
      layout?: GuidedDecisionLayout;
      fachdetailKey?: "bad_was";
    }
  | {
      type: "lead_form";
      prefillPlz?: string;
      projectSummary?: { label: string; value: string }[];
    }
  | {
      type: "plz_input";
      prefill?: string;
    }
  | {
      type: "price_card";
      result: BwCalculatePriceResult;
      draft: GuidedFunnelDraft;
    }
  | {
      type: "summary";
      items: { label: string; value: string }[];
    }
  | {
      type: "primary_cta";
      actionId: string;
      label: string;
      variant?: "primary" | "outline";
    }
  | {
      type: "viz_decision";
      question: GptVizPrepareQuestion;
    }
  | {
      type: "viz_limit";
      reason: "needs_lead" | "needs_portal" | "portal_monthly";
      portalRegisterUrl: string;
    };

export type GuidedPriceOutcome =
  | { kind: "price"; result: BwCalculatePriceResult; draft: GuidedFunnelDraft }
  | { kind: "beratung"; reason: string }
  | { kind: "incomplete"; nextField: GuidedField; draft: GuidedFunnelDraft };

export function draftToKiParsed(draft: GuidedFunnelDraft): KiParsedBekannt | null {
  if (!draft.situation || draft.bereiche.length === 0) return null;
  const fd: Record<string, string> = {};
  if (draft.fachdetails) {
    for (const [k, v] of Object.entries(draft.fachdetails)) {
      if (k === "sanitaer" && v && typeof v === "object" && "badWas" in v) {
        if (v.badWas) fd.bad = v.badWas;
      } else if (typeof v === "string") {
        fd[k] = v;
      }
    }
  }
  return {
    typ: "bekannt",
    situation: draft.situation,
    bereiche: draft.bereiche,
    groesse: draft.groesse,
    plz: draft.plz,
    zeitraum: draft.zeitraum,
    kundentyp: draft.kundentyp as KiParsedBekannt["kundentyp"],
    fachdetails: Object.keys(fd).length ? fd : undefined,
  };
}
