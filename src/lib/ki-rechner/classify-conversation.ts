import {
  createAnthropicClient,
  getClaudeApiKey,
  getClaudeModel,
  KI_CLAUDE_MODEL_FALLBACKS,
} from "@/lib/ki-rechner/claude-config";
import { isObviousOffTopic } from "@/lib/ki-rechner/guards";
import { parseKiResponseContent } from "@/lib/ki-rechner/parse-response";
import { getKiRechnerSystemPrompt } from "@/lib/ki-rechner/system-prompt";
import type { KiParsedPayload } from "@/lib/ki-rechner/types";

type ChatMessage = { role: "user" | "assistant"; content: string };

let cachedSystemPrompt: string | null = null;

function getSystemPrompt(): string {
  if (!cachedSystemPrompt) {
    cachedSystemPrompt = getKiRechnerSystemPrompt();
  }
  return cachedSystemPrompt;
}

export type KiConversationClassification = {
  typ: string;
  parsed: KiParsedPayload | null;
};

/** Extrahiert Rechner-Typ (bekannt / unbekannt / …) aus dem Chat-Verlauf — ohne Chat-Antwort. */
export async function classifyKiConversation(
  messages: ChatMessage[]
): Promise<KiConversationClassification | null> {
  const apiKey = getClaudeApiKey();
  if (!apiKey || messages.length === 0) return null;

  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  if (isObviousOffTopic(lastUser)) {
    return { typ: "off_topic", parsed: null };
  }

  const client = createAnthropicClient(apiKey);
  const models = [getClaudeModel(), ...KI_CLAUDE_MODEL_FALLBACKS].filter(
    (m, i, arr) => arr.indexOf(m) === i
  );

  let response: Awaited<ReturnType<typeof client.messages.create>> | null = null;
  let lastErr: unknown;

  for (const model of models) {
    try {
      response = await client.messages.create({
        model,
        max_tokens: 512,
        system: getSystemPrompt(),
        messages,
      });
      break;
    } catch (err) {
      lastErr = err;
      const status = (err as { status?: number }).status;
      if (status === 404) continue;
      throw err;
    }
  }

  if (!response) throw lastErr ?? new Error("Kein Claude-Modell verfügbar");

  const content =
    response.content[0]?.type === "text" ? response.content[0].text : "";

  let { parsed, typ } = parseKiResponseContent(content);

  if (
    typ === "off_topic" &&
    lastUser.trim().length < 32 &&
    !isObviousOffTopic(lastUser)
  ) {
    typ = "chat";
    parsed = null;
  }

  return { typ, parsed };
}
