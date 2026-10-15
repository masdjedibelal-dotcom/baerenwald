import { getOpenAiApiKey, getOpenAiModel, openAiTextClient } from "@/lib/shared-domain/ki-openai";

/** Text rein, Textblöcke raus (`messages.create` → `{ content: [{ type: "text", text }] }`). */
export type KiClient = ReturnType<typeof openAiTextClient>;

/** OPENAI_API_KEY (ohne Schlüssel ist die KI aus). */
export function getKiApiKey(): string | undefined {
  return getOpenAiApiKey() || undefined;
}

/** Aktives OpenAI-Modell (OPENAI_MODEL, sonst Standard). */
export function getKiModell(): string {
  return getOpenAiModel();
}

export function createKiClient(apiKey: string): KiClient {
  return openAiTextClient(apiKey);
}
