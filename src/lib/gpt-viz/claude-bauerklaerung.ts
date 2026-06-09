import {
  createAnthropicClient,
  getClaudeApiKey,
  getClaudeModel,
} from "@/lib/ki-rechner/claude-config";
import { extractJsonObject } from "@/lib/gpt-viz/claude-json";
import type { GptVizBauErklaerung, GptVizRaumAnalyse } from "@/lib/gpt-viz/types";

const SYSTEM = `Du bist Creative Copywriter und Fachberater für Bärenwald — digitaler GU in München.
Nach einer Raum-Visualisierung schreibst du Texte für ein share-taugliches Zielbild (Instagram Story / Pinterest Pin).

Antwort NUR als JSON:
{
  "titel": "Interner Projekttitel",
  "chat_kurz": "2–3 Sätze Du-Form für den Chat nach dem Bild — warm, konkret, welche Gewerke nötig sind.",
  "zielbild_kicker": "2–4 Wörter, editorial, z. B. BADNEU · MÜNCHEN oder RAUMVISION · WALNUSS",
  "zielbild_headline": "Magazin-Headline, emotional, max. 7 Wörter",
  "zielbild_teaser": "Ein aspirativer Satz, max. 75 Zeichen — Pinterest-Hook",
  "zusammenfassung": "3–4 Sätze Du-Form — fachlicher Kontext (primär Chat/intern)",
  "gewerke": [{ "name": "Gewerk", "beschreibung": "max. 4 Wörter" }],
  "ablauf": ["Schritt …"],
  "naechste_schritte": ["Anfrage", "Beratung", "Angebot annehmen", "Umsetzung"],
  "hinweis_gu": "Eleganter Micro-Satz unter dem CTA, max. 55 Zeichen",
  "cta_text": "Anfragen",
  "preis_hinweis_optional": "optional, keine Euro-Beträge"
}

ZIELBILD-COPY — SO SCHreiben (Instagram/Pinterest):
- zielbild_kicker: Raum + Stil oder Ort, mit · getrennt. Klingt wie ein Magazin-Rubrik. Kein „Visualisierung“.
- zielbild_headline: Wie Pin-Titel oder Interior-Editorial — bildhaft, nicht technisch.
  GUT: „Wohnen wie im Spa“, „Walnuss trifft Naturstein“, „Hell, klar, endlich deins“
  SCHLECHT: „Dein Weg zum modernen Bad“, „Badrenovierung geplant“, „Visualisierung fertig“
- zielbild_teaser: Ein Satz, der Lust aufs Projekt macht — leicht poetisch, kein Fachchinesisch.
- cta_text: Max. 2–3 Wörter, aktiv: „Anfragen“, „Projekt starten“, „Loslegen“
- naechste_schritte: 4 kurze Labels (2–3 Wörter) für Flow: Anfrage → Beratung → Angebot annehmen → Umsetzung
- hinweis_gu: dezent, z. B. „Ein Ansprechpartner · alle Gewerke“
- Gewerke: 3–4 Namen, kurz (Fliesen, Sanitär, Elektro …)

REGELN:
- Du-Form, verkaufsorientiert aber ehrlich — nie Kundenwunsch copy-pasten.
- KEINE Zeitangaben, keine Preise, keine URLs, keine Kontaktdaten.
- Kein JSON außerhalb des Blocks.`;

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
      o.chat_kurz ??
        (zusammenfassung.slice(0, 280) ||
          "So könnte dein Raum aussehen — wir begleiten dich von der Idee bis zur Umsetzung.")
    ),
    zielbild_kicker: o.zielbild_kicker ? String(o.zielbild_kicker).slice(0, 48) : undefined,
    zielbild_headline: String(o.zielbild_headline ?? titel).slice(0, 80),
    zielbild_teaser: String(
      o.zielbild_teaser ??
        (zusammenfassung.split(/[.!?]/)[0]?.trim().slice(0, 90) ||
          "Dein Wunschraum — umgesetzt aus einer Hand.")
    ).slice(0, 100),
    zusammenfassung,
    gewerke: gewerke.slice(0, 6).map((g) => {
      const item = g as Record<string, unknown>;
      return {
        name: String(item.name ?? ""),
        beschreibung: String(item.beschreibung ?? ""),
      };
    }),
    ablauf: ablauf.map(String),
    naechste_schritte: schritte
      .slice(0, 4)
      .map((s) => String(s).replace(/^\d+[.)]\s*/, "").trim()),
    hinweis_gu: o.hinweis_gu ? String(o.hinweis_gu).slice(0, 70) : undefined,
    cta_text: String(o.cta_text ?? "Anfragen").slice(0, 28),
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
        content: `Raum: ${raum}\nVisualisierungswunsch (intern, nicht wörtlich zitieren): ${input.wunschText}\n\nSchreibe editorial-starke Zielbild-Texte passend zum Raum und Stil.`,
      },
    ],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("\n");

  return validate(extractJsonObject(text));
}
