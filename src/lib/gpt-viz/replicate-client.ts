import { REPLICATE_INTERIOR_MODEL } from "@/lib/gpt-viz/constants";

const REPLICATE_API = "https://api.replicate.com/v1";

/** Copy-Paste aus Netlify/UI: Anführungszeichen, Zeilenumbrüche entfernen. */
export function normalizeReplicateApiToken(raw: string): string {
  return raw.replace(/^["']|["']$/g, "").replace(/\s/g, "");
}

export function getReplicateToken(): string | undefined {
  const raw = process.env.REPLICATE_API_TOKEN?.trim();
  if (!raw) return undefined;
  const token = normalizeReplicateApiToken(raw);
  return token.length > 0 ? token : undefined;
}

export function isPlausibleReplicateApiToken(token: string): boolean {
  return /^r8_[A-Za-z0-9]+$/.test(token) && token.length >= 20;
}

export function getReplicateTokenDiagnostics(): {
  configured: boolean;
  keyLength: number;
  keyFormatOk: boolean;
} {
  const token = getReplicateToken();
  if (!token) {
    return { configured: false, keyLength: 0, keyFormatOk: false };
  }
  return {
    configured: true,
    keyLength: token.length,
    keyFormatOk: isPlausibleReplicateApiToken(token),
  };
}

type Prediction = {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string | string[] | null;
  error?: string | null;
};

async function createPrediction(input: {
  image: string;
  prompt: string;
  prompt_strength?: number;
  guidance_scale?: number;
  negative_prompt?: string;
}): Promise<Prediction> {
  const token = getReplicateToken();
  if (!token) throw new Error("REPLICATE_API_TOKEN fehlt.");

  const version = REPLICATE_INTERIOR_MODEL.split(":")[1];
  if (!version) throw new Error("Replicate-Modellversion fehlt.");

  const res = await fetch(`${REPLICATE_API}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "wait=60",
    },
    body: JSON.stringify({
      version,
      input: {
        image: input.image,
        prompt: input.prompt,
        num_inference_steps: 40,
        guidance_scale: input.guidance_scale ?? 10,
        prompt_strength: input.prompt_strength ?? 0.45,
        ...(input.negative_prompt ? { negative_prompt: input.negative_prompt } : {}),
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401) {
      throw new Error(
        "Replicate API-Token fehlt oder ist ungültig — REPLICATE_API_TOKEN in Netlify setzen."
      );
    }
    throw new Error(`Replicate Fehler: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as Prediction;
}

async function getPrediction(id: string): Promise<Prediction> {
  const token = getReplicateToken();
  if (!token) throw new Error("REPLICATE_API_TOKEN fehlt.");
  const res = await fetch(`${REPLICATE_API}/predictions/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Replicate Status konnte nicht geladen werden.");
  return (await res.json()) as Prediction;
}

function extractOutputUrl(output: Prediction["output"]): string | null {
  if (!output) return null;
  if (typeof output === "string") return output;
  if (Array.isArray(output) && typeof output[0] === "string") return output[0];
  return null;
}

export async function runInteriorDesignRender(input: {
  imageUrl: string;
  prompt: string;
  prompt_strength?: number;
  guidance_scale?: number;
  negative_prompt?: string;
}): Promise<string> {
  let prediction = await createPrediction({
    image: input.imageUrl,
    prompt: input.prompt,
    prompt_strength: input.prompt_strength,
    guidance_scale: input.guidance_scale,
    negative_prompt: input.negative_prompt,
  });

  const deadline = Date.now() + 120_000;
  while (
    prediction.status !== "succeeded" &&
    prediction.status !== "failed" &&
    prediction.status !== "canceled"
  ) {
    if (Date.now() > deadline) {
      throw new Error("Render dauert zu lange — bitte später erneut versuchen.");
    }
    await new Promise((r) => setTimeout(r, 2000));
    prediction = await getPrediction(prediction.id);
  }

  if (prediction.status !== "succeeded") {
    throw new Error(prediction.error || "Render fehlgeschlagen.");
  }

  const url = extractOutputUrl(prediction.output);
  if (!url) throw new Error("Kein Bild von Replicate erhalten.");
  return url;
}

export function isReplicateConfigured(): boolean {
  return Boolean(getReplicateToken());
}
