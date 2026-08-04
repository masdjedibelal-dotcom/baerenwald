import {
  createAnthropicClient,
  getClaudeApiKey,
  getClaudeModel,
} from "@/lib/ki-rechner/claude-config";
import { extractJsonObject } from "@/lib/gpt-viz/claude-json";
import type {
  GptVizBrief,
  GptVizModus,
  GptVizPrepareQuestion,
  GptVizRaumAnalyse,
} from "@/lib/gpt-viz/types";

const SYSTEM = `Du bereitest eine Renovierungs-Visualisierung für Bärenwald München vor.
Vergleiche Ist-Raumbild, optional Inspirationsbild und Nutzerwunsch.
Stelle KEINE Rückfragen an den Nutzer — entscheide selbst anhand der Daten.

Antwort NUR als JSON:
{
  "modus": "auffrischen|teilsanierung|stil_update",
  "struktur_lock": true,
  "preserve": ["Fenster hinten", "…"],
  "aenderungen": ["Wandfliesen", "…"],
  "questions": []
}

modus:
- auffrischen = nur Material/Farbe/Oberflächen (Standard wenn unklar)
- teilsanierung = + Sanitär, Armaturen, Licht
- stil_update = stärkerer Look, aber ohne Grundrissänderung wenn struktur_lock

struktur_lock: fast immer true — gleiche Fenster, Türen, Grundriss, Kamerawinkel.
preserve: alles was im Ist-Bild sichtbar ist und bleiben soll.
aenderungen: nur Oberflächen/Material/Stil laut Wunsch.
questions: IMMER leeres Array [].`;

export type VizPrepareResult = {
  ready: boolean;
  viz_brief: GptVizBrief;
  questions: GptVizPrepareQuestion[];
};

function defaultPreserve(ist?: GptVizRaumAnalyse | null): string[] {
  const fromFix = ist?.fixierte_elemente
    ?.filter((e) => e.preserve_default)
    .map((e) => e.label)
    .filter(Boolean);
  if (fromFix?.length) return fromFix;
  return (ist?.erkannte_elemente ?? []).slice(0, 6);
}

function defaultAenderungen(ist?: GptVizRaumAnalyse | null): string[] {
  if (ist?.veraenderbare_flaechen?.length) return ist.veraenderbare_flaechen.slice(0, 5);
  return ["Wandoberflächen", "Boden/Fliesen", "Beleuchtung"];
}

function validateModus(raw: unknown): GptVizModus {
  const v = String(raw ?? "auffrischen");
  if (v === "teilsanierung" || v === "stil_update") return v;
  return "auffrischen";
}

export function mergeVizBriefAnswer(
  brief: GptVizBrief,
  questionId: string,
  optionId: string,
  optionLabel: string
): GptVizBrief {
  const beantwortet = brief.beantwortete_fragen.includes(questionId)
    ? brief.beantwortete_fragen
    : [...brief.beantwortete_fragen, questionId];

  const antworten = { ...(brief.nutzer_antworten ?? {}), [questionId]: optionLabel };

  let modus = brief.modus;
  let struktur_lock = brief.struktur_lock;
  const preserve = [...brief.preserve];
  const aenderungen = [...brief.aenderungen];

  if (questionId.includes("modus") || questionId.includes("umfang")) {
    if (optionId.includes("auffrischen")) modus = "auffrischen";
    else if (optionId.includes("teil")) modus = "teilsanierung";
    else if (optionId.includes("stil")) modus = "stil_update";
  }
  if (questionId.includes("fenster") || questionId.includes("struktur")) {
    if (optionId.includes("behalten") || optionId.includes("weg") || optionId.includes("kein")) {
      struktur_lock = true;
      if (!preserve.some((p) => /fenster/i.test(p))) preserve.push("Keine neuen Fenster");
    }
    if (optionId.includes("inspiration") || optionId.includes("stimmung")) {
      struktur_lock = true;
    }
    if (optionId.includes("bau") || optionId.includes("echt")) {
      struktur_lock = false;
    }
  }
  if (questionId.includes("inspiration") && optionId.includes("nur_material")) {
    modus = "auffrischen";
    struktur_lock = true;
  }

  return {
    modus,
    struktur_lock,
    preserve: Array.from(new Set(preserve)),
    aenderungen: Array.from(new Set(aenderungen)),
    beantwortete_fragen: beantwortet,
    nutzer_antworten: antworten,
  };
}

export function fallbackVizBrief(ist?: GptVizRaumAnalyse | null): GptVizBrief {
  return {
    modus: "auffrischen",
    struktur_lock: true,
    preserve: defaultPreserve(ist),
    aenderungen: defaultAenderungen(ist),
    beantwortete_fragen: [],
  };
}

export async function prepareVizRender(input: {
  wunschText: string;
  istAnalyse?: GptVizRaumAnalyse | null;
  inspirationAnalyse?: GptVizRaumAnalyse | null;
  existingBrief?: GptVizBrief | null;
}): Promise<VizPrepareResult> {
  const existing = input.existingBrief ?? fallbackVizBrief(input.istAnalyse);

  const apiKey = getClaudeApiKey();
  if (!apiKey) {
    return { ready: true, viz_brief: existing, questions: [] };
  }

  const istCtx = input.istAnalyse
    ? `Ist-Raum (${input.istAnalyse.raum_label}): ${input.istAnalyse.ist_beschreibung}\nElemente: ${(input.istAnalyse.erkannte_elemente ?? []).join(", ")}`
    : "Ist-Raum: nicht analysiert";
  const zielCtx = input.inspirationAnalyse
    ? `Inspiration: ${input.inspirationAnalyse.ist_beschreibung}\nElemente: ${(input.inspirationAnalyse.erkannte_elemente ?? []).join(", ")}`
    : "Kein Inspirationsbild";
  const beantwortet = existing.beantwortete_fragen.length
    ? `Bereits beantwortet: ${JSON.stringify(existing.nutzer_antworten ?? {})}`
    : "Noch keine Antworten";

  const client = createAnthropicClient(apiKey);
  const response = await client.messages.create({
    model: getClaudeModel(),
    max_tokens: 1200,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `${istCtx}\n${zielCtx}\nWunsch: ${input.wunschText}\n${beantwortet}\n\nErzeuge nur den Brief — questions bleibt [].`,
      },
    ],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("\n");

  try {
    const raw = extractJsonObject(text) as Record<string, unknown>;

    const viz_brief: GptVizBrief = {
      modus: validateModus(raw.modus) ?? existing.modus,
      struktur_lock: raw.struktur_lock !== false,
      preserve:
        Array.isArray(raw.preserve) && raw.preserve.length
          ? raw.preserve.map(String)
          : existing.preserve.length
            ? existing.preserve
            : defaultPreserve(input.istAnalyse),
      aenderungen:
        Array.isArray(raw.aenderungen) && raw.aenderungen.length
          ? raw.aenderungen.map(String)
          : existing.aenderungen.length
            ? existing.aenderungen
            : defaultAenderungen(input.istAnalyse),
      beantwortete_fragen: existing.beantwortete_fragen,
      nutzer_antworten: existing.nutzer_antworten,
    };

    const questions: GptVizPrepareQuestion[] = [];
    return {
      ready: true,
      viz_brief,
      questions,
    };
  } catch {
    return { ready: true, viz_brief: existing, questions: [] };
  }
}
