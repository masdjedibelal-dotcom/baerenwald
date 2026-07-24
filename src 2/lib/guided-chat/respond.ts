import {
  buildDraftSummaryItems,
  buildGuidedBlock,
  getNextGuidedField,
  mergeFromKiParsed,
} from "./draft";
import { tryGuidedInlinePrice } from "./inline-price";
import type { GuidedFunnelDraft, GptChatBlock } from "./types";
import type { KiParsedBekannt } from "@/lib/ki-rechner/types";

export type GuidedAssistantPayload = {
  text: string;
  blocks: GptChatBlock[];
  draft: GuidedFunnelDraft;
};

export function buildGuidedAssistantFromDraft(
  draft: GuidedFunnelDraft,
  opts?: {
    prefixText?: string;
    forceField?: ReturnType<typeof getNextGuidedField>;
  }
): GuidedAssistantPayload {
  const summary = buildDraftSummaryItems(draft);
  const summaryBlock: GptChatBlock | null =
    summary.length > 0 ? { type: "summary", items: summary } : null;

  const priceOutcome = tryGuidedInlinePrice(draft);
  if (priceOutcome?.kind === "price") {
    return {
      draft,
      text:
        opts?.prefixText ??
        "Hier ist dein **unverbindlicher Preisrahmen** — berechnet mit unserer Rechner-Logik, nicht geschätzt.",
      blocks: [
        ...(summaryBlock ? [summaryBlock] : []),
        { type: "price_card", result: priceOutcome.result, draft: priceOutcome.draft },
      ],
    };
  }

  if (priceOutcome?.kind === "beratung") {
    return {
      draft,
      text: priceOutcome.reason,
      blocks: [
        ...(summaryBlock ? [summaryBlock] : []),
        { type: "primary_cta", actionId: "lead_start", label: "Anfrage senden" },
      ],
    };
  }

  const nextField = opts?.forceField ?? getNextGuidedField(draft);
  if (!nextField) {
    return {
      draft,
      text: opts?.prefixText ?? "Erzähl mir gern mehr — oder wähle unten einen Weg.",
      blocks: summaryBlock ? [summaryBlock] : [{ type: "journey_entry" }],
    };
  }

  return {
    draft,
    text: opts?.prefixText ?? guidedPromptForField(nextField),
    blocks: [
      ...(summaryBlock ? [summaryBlock] : []),
      buildGuidedBlock(nextField, draft),
    ],
  };
}

export function mergeClassificationIntoGuided(
  draft: GuidedFunnelDraft,
  typ: string | undefined,
  parsed: KiParsedBekannt | { typ: string; antwort?: string } | null | undefined,
  displayText?: string
): GuidedAssistantPayload {
  if (typ === "bekannt" && parsed?.typ === "bekannt") {
    const merged = mergeFromKiParsed(draft, parsed as KiParsedBekannt);
    return buildGuidedAssistantFromDraft(merged, { prefixText: displayText });
  }

  if (typ === "unbekannt" || typ === "zu_komplex") {
    const antwort =
      parsed && "antwort" in parsed && parsed.antwort
        ? parsed.antwort
        : displayText ??
          "Für dein Vorhaben ist eine persönliche Einschätzung am sinnvollsten — ich helfe dir gern bei der Anfrage.";
    return {
      draft,
      text: antwort,
      blocks: [{ type: "primary_cta", actionId: "lead_start", label: "Anfrage senden" }],
    };
  }

  return buildGuidedAssistantFromDraft(draft, { prefixText: displayText });
}

function guidedPromptForField(field: NonNullable<ReturnType<typeof getNextGuidedField>>): string {
  switch (field) {
    case "situation":
      return "Damit ich dir gezielt helfen kann — was trifft auf dein Vorhaben zu?";
    case "bereich":
      return "Welches Gewerk oder welcher Bereich steht im Fokus?";
    case "fachdetail":
      return "Noch eine kurze Frage zu deinem Projekt:";
    case "groesse":
      return "Wie groß ist der Bereich ungefähr? Eine Schätzung reicht.";
    case "plz":
      return "In welcher Postleitzahl liegt das Objekt? (München & Umgebung)";
    case "zeitraum":
      return "Wann soll es ungefähr losgehen?";
    default:
      return "Wie kann ich dir helfen?";
  }
}
