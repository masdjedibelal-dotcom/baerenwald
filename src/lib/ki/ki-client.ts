import { createAnthropicClient, getClaudeApiKey } from "@/lib/ki-rechner/claude-config";
import { getOpenAiApiKey, getOpenAiModel, kiAnbieter, openAiAlsClaudeClient } from "@/lib/shared-domain/ki-openai";

export { kiAnbieter };

/** Gleiche Form für beide Anbieter: Text rein, Textblöcke raus (wie Anthropic `messages.create`). */
export type KiClient = {
  messages: {
    create(p: {
      model: string;
      max_tokens: number;
      system?: string;
      messages: { role: "user" | "assistant"; content: string }[];
    }): Promise<{ content: { type: "text"; text: string }[]; stop_reason: string | null }>;
  };
};

/** Schlüssel des aktiven Anbieters — OpenAI, sobald OPENAI_API_KEY gesetzt ist, sonst Claude. */
export function getKiApiKey(): string | undefined {
  if (kiAnbieter() === "openai") return getOpenAiApiKey() || undefined;
  return getClaudeApiKey();
}

/** Modellname zur Anzeige/Diagnose. */
export function getKiModellAnzeige(claudeModel: string): string {
  return kiAnbieter() === "openai" ? getOpenAiModel() : claudeModel;
}

export function createKiClient(apiKey: string): KiClient {
  if (kiAnbieter() === "openai") return openAiAlsClaudeClient(apiKey);
  const anthropic = createAnthropicClient(apiKey);
  return {
    messages: {
      async create(p) {
        const r = await anthropic.messages.create(p);
        return {
          content: r.content.flatMap((b) => (b.type === "text" ? [{ type: "text" as const, text: b.text }] : [])),
          stop_reason: r.stop_reason,
        };
      },
    },
  };
}
