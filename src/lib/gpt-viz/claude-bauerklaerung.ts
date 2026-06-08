import {
  createAnthropicClient,
  getClaudeApiKey,
  getClaudeModel,
} from "@/lib/ki-rechner/claude-config";
import { extractJsonObject } from "@/lib/gpt-viz/claude-json";
import type { GptVizBauErklaerung, GptVizRaumAnalyse } from "@/lib/gpt-viz/types";

const SYSTEM = `Du erklärst einem Endkunden in München, wie Bärenwald als GU sein Renovierungsprojekt umsetzen würde.
Antwort NUR als JSON:
{
  "titel": "…",
  "zusammenfassung": "2-4 Sätze Du-Form",
  "gewerke": [{ "name": "…", "beschreibung": "…" }],
  "ablauf": ["Schritt 1 …", "Schritt 2 …"],
  "hinweis_gu": "Warum GU sinnvoll",
  "preis_hinweis_optional": "optional, vorsichtig, keine konkreten Euro-Beträge"
}
Keine erfundenen Preise. Keine Kontaktdaten.`;

function validate(raw: unknown): GptVizBauErklaerung {
  const o = raw as Record<string, unknown>;
  const gewerke = Array.isArray(o.gewerke) ? o.gewerke : [];
  const ablauf = Array.isArray(o.ablauf) ? o.ablauf : [];
  return {
    titel: String(o.titel ?? "So könnte Bärenwald dein Projekt umsetzen"),
    zusammenfassung: String(o.zusammenfassung ?? ""),
    gewerke: gewerke.map((g) => {
      const item = g as Record<string, unknown>;
      return {
        name: String(item.name ?? ""),
        beschreibung: String(item.beschreibung ?? ""),
      };
    }),
    ablauf: ablauf.map(String),
    hinweis_gu: o.hinweis_gu ? String(o.hinweis_gu) : undefined,
    preis_hinweis_optional: o.preis_hinweis_optional
      ? String(o.preis_hinweis_optional)
      : undefined,
  };
}

export async function generateBauErklaerung(input: {
  wunschText: string;
  raumAnalyse?: GptVizRaumAnalyse | null;
}): Promise<GptVizBauErklaerung> {
  const apiKey = getClaudeApiKey();
  if (!apiKey) throw new Error("Claude API nicht konfiguriert.");

  const client = createAnthropicClient(apiKey);
  const raum = input.raumAnalyse
    ? `${input.raumAnalyse.raum_label}: ${input.raumAnalyse.ist_beschreibung}`
    : "Raum nicht analysiert";

  const response = await client.messages.create({
    model: getClaudeModel(),
    max_tokens: 1200,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Raum: ${raum}\nVisualisierungswunsch: ${input.wunschText}`,
      },
    ],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("\n");

  return validate(extractJsonObject(text));
}
