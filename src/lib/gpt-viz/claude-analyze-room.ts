import {
  createAnthropicClient,
  getClaudeApiKey,
  getClaudeModel,
} from "@/lib/ki-rechner/claude-config";
import { extractJsonObject } from "@/lib/gpt-viz/claude-json";
import { loadImageBase64ForClaude } from "@/lib/gpt-viz/storage";
import type { GptVizRaumAnalyse } from "@/lib/gpt-viz/types";

const ROOM_SYSTEM = `Du analysierst ein Raumfoto für Bärenwald München (Handwerk/Renovierung als GU).
Erkenne Raumtyp, beschreibe den Ist-Zustand sachlich auf Deutsch (Du-Form).
Schlage 3 unterschiedliche Stil-Richtungen vor, passend zum erkannten Raum.
Formuliere einen ersten Visualisierungs-Wunsch als Entwurf — der Nutzer bearbeitet ihn.
Antwort NUR als JSON mit exakt diesen Feldern:
{
  "raum_typ": "bad|kueche|wohnzimmer|schlafzimmer|flur|sonstiges",
  "raum_label": "Anzeigename",
  "ist_beschreibung": "…",
  "erkannte_elemente": ["…"],
  "einschaetzung": "…",
  "stil_vorschlaege": [
    { "titel": "…", "kurz": "…", "prompt_de": "deutscher Visualisierungswunsch" }
  ],
  "wunsch_entwurf": "…"
}
Keine Preise erfinden. Keine Kontaktdaten erfragen.`;

const INSPIRATION_SYSTEM = `Du analysierst ein Inspirations-/Mood-Bild für eine Renovierung (Bärenwald München).
Beschreibe Stil, Materialien, Farben und Atmosphäre auf Deutsch (Du-Form).
Formuliere daraus einen Visualisierungs-Wunsch, den der Nutzer auf seinen eigenen Raum anwenden kann.
Antwort NUR als JSON mit exakt diesen Feldern:
{
  "raum_typ": "inspiration",
  "raum_label": "Inspirationsbild",
  "ist_beschreibung": "Stil-Beschreibung des Inspirationsbildes …",
  "stil_vorschlaege": [
    { "titel": "…", "kurz": "…", "prompt_de": "deutscher Visualisierungswunsch" }
  ],
  "wunsch_entwurf": "…"
}
Keine Preise erfinden. Keine Kontaktdaten erfragen.`;

function validateAnalyse(raw: unknown): GptVizRaumAnalyse {
  const o = raw as Record<string, unknown>;
  if (!o || typeof o !== "object") throw new Error("Ungültige Analyse.");
  const stil = Array.isArray(o.stil_vorschlaege) ? o.stil_vorschlaege : [];
  return {
    raum_typ: String(o.raum_typ ?? "sonstiges"),
    raum_label: String(o.raum_label ?? "Raum"),
    ist_beschreibung: String(o.ist_beschreibung ?? ""),
    erkannte_elemente: Array.isArray(o.erkannte_elemente)
      ? o.erkannte_elemente.map(String)
      : undefined,
    einschaetzung: o.einschaetzung ? String(o.einschaetzung) : undefined,
    stil_vorschlaege: stil.slice(0, 3).map((s) => {
      const item = s as Record<string, unknown>;
      return {
        titel: String(item.titel ?? ""),
        kurz: String(item.kurz ?? ""),
        prompt_de: String(item.prompt_de ?? ""),
      };
    }),
    wunsch_entwurf: String(o.wunsch_entwurf ?? ""),
  };
}

async function analyzeImageWithClaude(
  storedUrl: string,
  system: string,
  userText: string
): Promise<GptVizRaumAnalyse> {
  const apiKey = getClaudeApiKey();
  if (!apiKey) throw new Error("Claude API nicht konfiguriert.");

  const { mediaType, data } = await loadImageBase64ForClaude(storedUrl);
  const client = createAnthropicClient(apiKey);
  const response = await client.messages.create({
    model: getClaudeModel(),
    max_tokens: 1200,
    system,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data },
          },
          { type: "text", text: userText },
        ],
      },
    ],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("\n");

  return validateAnalyse(extractJsonObject(text));
}

export async function analyzeRoomImage(storedUrl: string): Promise<GptVizRaumAnalyse> {
  return analyzeImageWithClaude(
    storedUrl,
    ROOM_SYSTEM,
    "Analysiere dieses Raumfoto für eine Renovierungs-Visualisierung."
  );
}

export async function analyzeInspirationImage(storedUrl: string): Promise<GptVizRaumAnalyse> {
  return analyzeImageWithClaude(
    storedUrl,
    INSPIRATION_SYSTEM,
    "Leite daraus einen Renovierungs-Wunsch ab, den man auf den eigenen Raum übertragen kann."
  );
}
