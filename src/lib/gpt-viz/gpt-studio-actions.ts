import type { GptChatAction } from "@/components/gpt/gpt-chat-types";
import type { GptStudioIntent } from "@/lib/gpt-viz/gpt-studio-intents";

type ActionContext = {
  intent: GptStudioIntent;
  istUrl: boolean;
  wunschText: string;
  hasRenderResult: boolean;
};

/** CTAs nur für die aktuelle Nachricht — nicht dauerhaft im Chat mitschleppen. */
export function actionsForIntent(ctx: ActionContext): GptChatAction[] | undefined {
  const { intent, istUrl, wunschText, hasRenderResult } = ctx;
  const actions: GptChatAction[] = [];

  if (intent === "suggest_viz") {
    actions.push({ id: "start_viz", label: "Raum visualisieren" });
  }

  if (
    (intent === "suggest_render" || intent === "render") &&
    istUrl &&
    wunschText.trim() &&
    !hasRenderResult
  ) {
    actions.push({ id: "render", label: "So visualisieren" });
  }

  return actions.length ? actions : undefined;
}

export function postRenderActions(
  renderCount: number,
  maxRenders: number,
  leadUnlocked: boolean
): GptChatAction[] {
  const actions: GptChatAction[] = [];
  const left = Math.max(0, maxRenders - renderCount);
  if (left > 0) {
    actions.push({ id: "render_again", label: "Noch anpassen" });
  }
  if (!leadUnlocked) {
    actions.push({
      id: "lead_start",
      label: left <= 0 ? "Projekt senden — 2× anpassen" : "Projekt senden",
    });
  }
  return actions;
}
