export type GptStudioIntent =
  | "render"
  | "suggest_render"
  | "suggest_viz"
  | "lead_start"
  | null;

type IntentContext = {
  lastUser: string;
  leadActive: boolean;
  vizFlowActive: boolean;
  hasPhoto: boolean;
  hasWunsch: boolean;
  hasRenderResult: boolean;
};

const EXPLICIT_RENDER =
  /\b(jetzt visualisier|visualisier(?:en)?(?:\s+(?:bitte|es|mal))?|so umsetzen|render(?:n)?|mach(?:en)?\s+(?:das|mir\s+(?:das|ein))\s+bild|zeig(?:en|)\s+(?:mir\s+)?(?:das\s+)?(?:ergebnis|bild))\b/i;

const READINESS_FOR_RENDER =
  /\b(fertig|passt|genau so|so soll|klingt gut|bereit|los geht|kannst du mir zeigen|mach daraus|setz(?:en|)\s+(?:es|das)\s+um)\b/i;

const EXPLICIT_LEAD =
  /\b(anfrage|projekt senden|an uns senden|abschicken|kontakt aufnehmen|anfrage stellen|anfrage abschicken)\b/i;

const VIZ_TOPIC =
  /\b(raum|bad|küche|wohnzimmer|flur|balkon|schlafzimmer|renovier|umbau|neu gestalten|modernisier|fliesen|farbe|stil)\b/i;

const VIZ_INTENT_WORDS =
  /\b(vorstell|idee|wünsch|hätte gern|möchte|aussehen|gestalten|heller|dunkler|minimalist|gemütlich)\b/i;

export function detectGptStudioIntent(ctx: IntentContext): GptStudioIntent {
  const { lastUser, leadActive, vizFlowActive, hasPhoto, hasWunsch, hasRenderResult } = ctx;
  const lower = lastUser.toLowerCase();

  if (leadActive) return null;

  if (hasRenderResult && EXPLICIT_LEAD.test(lower)) return "lead_start";

  const canRender = hasPhoto && hasWunsch && !hasRenderResult;

  if (canRender && EXPLICIT_RENDER.test(lower)) return "render";

  if (vizFlowActive && canRender && READINESS_FOR_RENDER.test(lower)) {
    return "suggest_render";
  }

  if (!vizFlowActive && !hasPhoto && VIZ_TOPIC.test(lower) && VIZ_INTENT_WORDS.test(lower)) {
    return "suggest_viz";
  }

  if (vizFlowActive && canRender && EXPLICIT_RENDER.test(lower)) return "render";

  return null;
}
