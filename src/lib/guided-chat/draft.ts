import { BW_FUNNEL_STEP1_OPTIONS } from "@/lib/funnel/situation-options";
import {
  getGroesseConfig,
  getZeitraumOptions,
  groesseEinheitFromConfig,
  needsZeitraumSelection,
  SITUATIONEN_CONFIG,
} from "@/lib/funnel/config";
import type { Situation } from "@/lib/funnel/types";
import type { KiParsedBekannt } from "@/lib/ki-rechner/types";
import { kiPayloadToFunnelHandoff } from "@/lib/ki-rechner/apply-payload";

import {
  applyFachdetailValue,
  fachdetailOptionsForKey,
  fachdetailQuestionForKey,
  getMissingFachdetailKey,
} from "./fachdetails";
import type {
  GuidedDecisionOption,
  GuidedField,
  GuidedFunnelDraft,
  GptChatBlock,
} from "./types";
import { draftToKiParsed } from "./types";
import { ZEITRAUM_FRAGEN } from "@/lib/funnel/config";

const TOP_BEREICH_LIMIT = 8;

export function emptyGuidedDraft(): GuidedFunnelDraft {
  return { bereiche: [] };
}

export function mergeGuidedDraft(
  draft: GuidedFunnelDraft,
  patch: Partial<GuidedFunnelDraft>
): GuidedFunnelDraft {
  return {
    ...draft,
    ...patch,
    bereiche: patch.bereiche ?? draft.bereiche,
    fachdetails: { ...draft.fachdetails, ...patch.fachdetails },
  };
}

export function mergeFromKiParsed(
  draft: GuidedFunnelDraft,
  parsed: KiParsedBekannt
): GuidedFunnelDraft {
  return mergeGuidedDraft(draft, {
    situation: parsed.situation,
    bereiche: parsed.bereiche.length ? parsed.bereiche : draft.bereiche,
    groesse: parsed.groesse ?? draft.groesse,
    plz: parsed.plz ?? draft.plz,
    zeitraum: parsed.zeitraum ?? draft.zeitraum,
    kundentyp: parsed.kundentyp ?? draft.kundentyp,
    fachdetails: parsed.fachdetails ?? draft.fachdetails,
  });
}

function bereichOptionsForSituation(situation: Situation): GuidedDecisionOption[] {
  const cfg = SITUATIONEN_CONFIG[situation];
  const step = cfg?.steps.find(
    (s) => s.inputType === "tiles-single" || s.inputType === "tiles-multi"
  );
  if (!step?.options) return [];

  const out: GuidedDecisionOption[] = [];
  for (const opt of step.options) {
    if (!opt.value || opt.value === "skip") continue;
    const trigger = opt.triggerGewerke?.[0] ?? opt.value;
    out.push({
      value: trigger,
      label: opt.label,
      hint: opt.hint,
      icon: opt.icon,
      emoji: opt.emoji,
    });
    if (out.length >= TOP_BEREICH_LIMIT) break;
  }
  return out;
}

export function getNextGuidedField(draft: GuidedFunnelDraft): GuidedField | null {
  if (!draft.situation) return "situation";
  if (draft.bereiche.length === 0) return "bereich";

  if (getMissingFachdetailKey(draft)) return "fachdetail";

  const handoff = draftToHandoff(draft);
  if (!handoff) return "bereich";

  const groesseCfg = getGroesseConfig({
    situation: handoff.situation,
    bereiche: handoff.bereiche,
    fachdetails: handoff.fachdetails,
  });

  if (groesseCfg && (draft.groesse == null || draft.groesse <= 0)) {
    return "groesse";
  }

  if (!draft.plz || draft.plz.replace(/\D/g, "").length < 5) {
    return "plz";
  }

  if (needsZeitraumSelection(handoff.situation) && !draft.zeitraum) {
    return "zeitraum";
  }

  return null;
}

export function draftToHandoff(draft: GuidedFunnelDraft) {
  const parsed = draftToKiParsed(draft);
  if (!parsed) return null;
  return kiPayloadToFunnelHandoff(parsed);
}

export function buildGuidedBlock(
  field: GuidedField,
  draft: GuidedFunnelDraft
): GptChatBlock {
  switch (field) {
    case "situation":
      return {
        type: "decision",
        field: "situation",
        question: "Was trifft auf dein Vorhaben zu?",
        options: BW_FUNNEL_STEP1_OPTIONS.map((o) => ({
          value: o.id,
          label: o.label,
          hint: o.hint,
          icon: o.icon,
          tag: o.tag,
        })),
      };
    case "bereich": {
      const situation = draft.situation!;
      return {
        type: "decision",
        field: "bereich",
        layout: "compact",
        question: "Welches Gewerk oder welcher Bereich?",
        options: bereichOptionsForSituation(situation),
      };
    }
    case "fachdetail": {
      const key = getMissingFachdetailKey(draft)!;
      return {
        type: "decision",
        field: "fachdetail",
        fachdetailKey: key,
        layout: "chip",
        question: fachdetailQuestionForKey(key),
        options: fachdetailOptionsForKey(key),
      };
    }
    case "groesse": {
      const cfg = getGroesseConfig({
        situation: draft.situation!,
        bereiche: draft.bereiche,
        fachdetails: draft.fachdetails ?? {},
      });
      if (!cfg) {
        return {
          type: "decision",
          field: "groesse",
          layout: "chip",
          question: "Wie groß ist der Bereich ungefähr?",
          options: [
            { value: "8", label: "Klein", hint: "Gäste-WC, kleines Bad" },
            { value: "12", label: "Mittel", hint: "Standard Bad" },
            { value: "20", label: "Groß", hint: "großes Bad" },
          ],
        };
      }
      return {
        type: "decision",
        field: "groesse",
        layout: "chip",
        question: `Größe (${cfg.einheit}) — eine Schätzung reicht.`,
        options: cfg.chips.map((c) => ({
          value: String(c.value),
          label: c.label,
          hint: c.hint,
        })),
      };
    }
    case "plz":
      return { type: "plz_input", prefill: draft.plz };
    case "zeitraum": {
      const situation = draft.situation!;
      const opts = getZeitraumOptions(situation);
      const frage = ZEITRAUM_FRAGEN[situation];
      return {
        type: "decision",
        field: "zeitraum",
        layout: "chip",
        question: frage.question || "Wann soll es losgehen?",
        hint: frage.hint,
        options: opts.map((o) => ({
          value: o.value,
          label: o.label,
          hint: o.hint,
          emoji: zeitraumEmoji(o.value, situation),
        })),
      };
    }
    default:
      return { type: "journey_entry" };
  }
}

export function applyGuidedFieldValue(
  draft: GuidedFunnelDraft,
  field: GuidedField,
  value: string
): GuidedFunnelDraft {
  switch (field) {
    case "situation":
      return mergeGuidedDraft(draft, { situation: value as Situation });
    case "bereich":
      return mergeGuidedDraft(draft, { bereiche: [value] });
    case "fachdetail": {
      const key = getMissingFachdetailKey(draft);
      if (!key) return draft;
      return applyFachdetailValue(draft, key, value);
    }
    case "groesse": {
      const n = Number(value);
      const cfg = getGroesseConfig({
        situation: draft.situation!,
        bereiche: draft.bereiche,
        fachdetails: draft.fachdetails ?? {},
      });
      const einheit = cfg ? groesseEinheitFromConfig(cfg) : "qm";
      return mergeGuidedDraft(draft, { groesse: n, groesseEinheit: einheit });
    }
    case "plz":
      return mergeGuidedDraft(draft, { plz: value.replace(/\D/g, "").slice(0, 5) });
    case "zeitraum":
      return mergeGuidedDraft(draft, {
        zeitraum: value as GuidedFunnelDraft["zeitraum"],
      });
    default:
      return draft;
  }
}

export function buildDraftSummaryItems(
  draft: GuidedFunnelDraft
): { label: string; value: string }[] {
  const items: { label: string; value: string }[] = [];
  const sit = BW_FUNNEL_STEP1_OPTIONS.find((o) => o.id === draft.situation);
  if (sit) items.push({ label: "Situation", value: sit.label });
  if (draft.bereiche[0]) {
    items.push({ label: "Bereich", value: draft.bereiche[0] });
  }
  if (draft.groesse) {
    items.push({ label: "Größe", value: `${draft.groesse} ${draft.groesseEinheit ?? "m²"}` });
  }
  if (draft.plz) items.push({ label: "PLZ", value: draft.plz });
  const badWas =
    draft.fachdetails?.sanitaer?.badWas ?? draft.fachdetails?.bad;
  if (badWas) {
    const opt = fachdetailOptionsForKey("bad_was").find(
      (o) => o.value === badWas
    );
    items.push({ label: "Bad", value: opt?.label ?? badWas });
  }
  if (draft.zeitraum) {
    const zOpts = draft.situation
      ? getZeitraumOptions(draft.situation)
      : [];
    const z = zOpts.find((o) => o.value === draft.zeitraum);
    items.push({ label: "Zeit", value: z?.label ?? draft.zeitraum });
  }
  return items;
}

export function buildLeadFormBlock(draft: GuidedFunnelDraft): GptChatBlock {
  return {
    type: "lead_form",
    prefillPlz: draft.plz,
    projectSummary: buildDraftSummaryItems(draft),
  };
}

function zeitraumEmoji(value: string, situation: Situation): string | undefined {
  if (situation === "kaputt") {
    if (value === "sofort") return "🚨";
    if (value === "diese_woche") return "⚡";
    return "📅";
  }
  if (value === "vier_wochen" || value === "sofort") return "⚡";
  if (value === "zwei_monate" || value === "naechster_monat") return "📅";
  if (value === "sechs_monate" || value === "naechste_saison") return "🗓️";
  return "✓";
}
