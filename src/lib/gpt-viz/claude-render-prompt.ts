import {
  createAnthropicClient,
  getClaudeApiKey,
  getClaudeModel,
} from "@/lib/ki-rechner/claude-config";
import type { GptVizRaumAnalyse } from "@/lib/gpt-viz/types";

const SYSTEM = `Du übersetzt deutsche Renovierungswünsche in einen englischen Stable-Diffusion-Prompt
für ein Interior-Design-Inpainting-Modell (Raumlayout bleibt erhalten).
Antwort NUR mit dem englischen Prompt als Plain Text, ohne Anführungszeichen, max. 120 Wörter.
Fokus: Materialien, Farben, Licht, Stil — realistisch, keine Menschen, kein Text im Bild.`;

export async function buildRenderPrompt(input: {
  wunschText: string;
  raumAnalyse?: GptVizRaumAnalyse | null;
  nachprompt?: string;
}): Promise<string> {
  const apiKey = getClaudeApiKey();
  if (!apiKey) throw new Error("Claude API nicht konfiguriert.");

  const client = createAnthropicClient(apiKey);
  const kontext = input.raumAnalyse
    ? `Raum: ${input.raumAnalyse.raum_label}. Ist: ${input.raumAnalyse.ist_beschreibung}`
    : "Raum unbekannt";

  const userText = [
    kontext,
    `Wunsch (DE): ${input.wunschText}`,
    input.nachprompt ? `Zusatz: ${input.nachprompt}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await client.messages.create({
    model: getClaudeModel(),
    max_tokens: 400,
    system: SYSTEM,
    messages: [{ role: "user", content: userText }],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("\n")
    .trim();

  if (!text) throw new Error("Render-Prompt konnte nicht erzeugt werden.");
  return text;
}
