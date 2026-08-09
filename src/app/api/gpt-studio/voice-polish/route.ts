import {
  createAnthropicClient,
  getClaudeApiKey,
  getClaudeModel,
  KI_CLAUDE_MODEL_FALLBACKS,
} from "@/lib/ki-rechner/claude-config";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

export const runtime = "nodejs";
export const maxDuration = 20;

/**
 * POST /api/gpt-studio/voice-polish
 * Body: { text } → { text } — Sprachnotiz → schlankes Deutsch.
 */
export async function POST(req: Request) {
  const apiKey = getClaudeApiKey();
  if (!apiKey) {
    return Response.json({ error: "KI nicht konfiguriert." }, { status: 503 });
  }

  const ip = getClientIp(req);
  const { allowed } = checkRateLimit(ip, 60, 60 * 60 * 1000, "gpt-studio-voice");
  if (!allowed) {
    return Response.json(
      { error: "Zu viele Anfragen — bitte später erneut." },
      { status: 429 }
    );
  }

  let body: { text?: string };
  try {
    body = (await req.json()) as { text?: string };
  } catch {
    return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const raw = String(body.text ?? "").trim();
  if (!raw) {
    return Response.json({ error: "Kein Text erkannt." }, { status: 400 });
  }
  if (raw.length > 4000) {
    return Response.json({ error: "Text zu lang." }, { status: 400 });
  }

  const system = [
    "Du formulierst gesprochene Sprachnotizen für einen Handwerks-Chat um.",
    "Aufgabe: Nur den Inhalt als klaren, schlanken deutschen Text wiedergeben.",
    "Keine Einleitung, keine Anführungszeichen, keine Meta-Kommentare.",
    "Füllwörter und Versprecher streichen, Sinn und Fakten behalten.",
    "Maximal 2–4 kurze Sätze, sofern der Inhalt nicht länger ist.",
  ].join(" ");

  const client = createAnthropicClient(apiKey);
  const models = [getClaudeModel(), ...KI_CLAUDE_MODEL_FALLBACKS];
  let lastError: unknown;

  for (const model of models) {
    try {
      const res = await client.messages.create({
        model,
        max_tokens: 400,
        system,
        messages: [{ role: "user", content: raw }],
      });
      const text = res.content
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("")
        .trim();
      if (!text) {
        return Response.json({ error: "Umschreibung fehlgeschlagen." }, { status: 502 });
      }
      return Response.json({ text });
    } catch (err) {
      lastError = err;
    }
  }

  console.error("[gpt-studio/voice-polish]", lastError);
  return Response.json({ error: "Umschreibung fehlgeschlagen." }, { status: 502 });
}
