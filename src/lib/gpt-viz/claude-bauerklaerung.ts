import {
  createAnthropicClient,
  getClaudeApiKey,
  getClaudeModel,
} from "@/lib/ki-rechner/claude-config";
import { extractJsonObject } from "@/lib/gpt-viz/claude-json";
import type { GptVizBauErklaerung, GptVizRaumAnalyse } from "@/lib/gpt-viz/types";

const SYSTEM = `Du bist Verkaufs- und Fachberater für Bärenwald — digitaler GU in München.
Nach einer Raum-Visualisierung erklärst du dem Endkunden verkaufsorientiert, aber ehrlich, was für die Umsetzung nötig ist.

Antwort NUR als JSON:
{
  "titel": "Projekttitel, z. B. Traumbad visualisiert",
  "chat_kurz": "2–3 Sätze Du-Form für den Chat direkt nach dem Bild — begeistert, konkret, welche Gewerke nötig sind. Kein Rohtext des Kundenwunsches.",
  "zielbild_headline": "Kurze Headline fürs Zielbild, z. B. Dein Weg zum Traumbad",
  "zusammenfassung": "3–4 Sätze Du-Form — Gesamtüberblick fürs Projekt",
  "gewerke": [{ "name": "Gewerk", "beschreibung": "1 kurzer Satz was gemacht wird" }],
  "ablauf": ["Schritt …", "Schritt …"],
  "naechste_schritte": ["1. …", "2. …", "3. …"],
  "hinweis_gu": "1 Satz warum Bärenwald als GU sinnvoll ist",
  "cta_text": "Projekt kostenlos anfragen",
  "preis_hinweis_optional": "optional, vorsichtig, keine Euro-Beträge"
}

REGELN:
- Verkäuferisch, professionell, Du-Form — kein Copy-Paste des Kundenwunsches.
- Gewerke: 3–5 realistische Positionen (Fliesen, Sanitär, Elektro …).
- naechste_schritte: genau 3 Schritte (Beratung → Angebot → Umsetzung o.ä.).
- KEINE Zeitangaben, keine Wochen/Dauer, keine erfundenen Preise.
- Keine Kontaktdaten im Text.`;

function validate(raw: unknown): GptVizBauErklaerung {
  const o = raw as Record<string, unknown>;
  const gewerke = Array.isArray(o.gewerke) ? o.gewerke : [];
  const ablauf = Array.isArray(o.ablauf) ? o.ablauf : [];
  const schritte = Array.isArray(o.naechste_schritte) ? o.naechste_schritte : ablauf;
  const titel = String(o.titel ?? "So könnte Bärenwald dein Projekt umsetzen");
  const zusammenfassung = String(o.zusammenfassung ?? "");

  return {
    titel,
    chat_kurz: String(
      o.chat_kurz ?? (zusammenfassung.slice(0, 280) || "So könnte dein Raum aussehen — wir begleiten dich von der Idee bis zur Umsetzung.")
    ),
    zielbild_headline: String(o.zielbild_headline ?? titel),
    zusammenfassung,
    gewerke: gewerke.slice(0, 6).map((g) => {
      const item = g as Record<string, unknown>;
      return {
        name: String(item.name ?? ""),
        beschreibung: String(item.beschreibung ?? ""),
      };
    }),
    ablauf: ablauf.map(String),
    naechste_schritte: schritte.slice(0, 3).map(String),
    hinweis_gu: o.hinweis_gu ? String(o.hinweis_gu) : undefined,
    cta_text: String(o.cta_text ?? "Projekt kostenlos anfragen"),
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
    max_tokens: 1400,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Raum: ${raum}\nVisualisierungswunsch (intern, nicht zitieren): ${input.wunschText}`,
      },
    ],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("\n");

  return validate(extractJsonObject(text));
}
