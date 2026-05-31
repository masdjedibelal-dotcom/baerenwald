import Anthropic from "@anthropic-ai/sdk";

import {
  countUserMessages,
  isObviousOffTopic,
  KI_MAX_MESSAGES_PER_REQUEST,
  KI_MAX_USER_MESSAGES,
  KI_OFF_TOPIC_REPLY,
  KI_RATE_LIMIT_PER_HOUR,
} from "@/lib/ki-rechner/guards";
import {
  getKiAssistantDisplayText,
  parseKiResponseContent,
} from "@/lib/ki-rechner/parse-response";
import { correctSuspiciousKiPrices } from "@/lib/ki-rechner/price-sanity";
import { getKiRechnerSystemPrompt } from "@/lib/ki-rechner/system-prompt";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  const apiKey = process.env.CLAUDE_API_KEY?.trim();
  if (!apiKey) {
    return Response.json(
      { error: "KI-Rechner ist nicht konfiguriert (CLAUDE_API_KEY fehlt)." },
      { status: 503 }
    );
  }

  const ip = getClientIp(req);
  const { allowed } = checkRateLimit(
    ip,
    KI_RATE_LIMIT_PER_HOUR,
    60 * 60 * 1000,
    "ki-rechner"
  );
  if (!allowed) {
    return Response.json(
      {
        error: "Zu viele Anfragen. Bitte in einer Stunde erneut versuchen.",
        typ: "rate_limited",
      },
      { status: 429 }
    );
  }

  let body: { messages?: ChatMessage[]; session_id?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "messages fehlt." }, { status: 400 });
  }

  const sanitized: ChatMessage[] = messages
    .filter(
      (m): m is ChatMessage =>
        m != null &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string"
    )
    .map((m) => ({
      role: m.role,
      content: m.content.slice(0, 8000),
    }));

  if (sanitized.length === 0) {
    return Response.json({ error: "Keine gültigen Nachrichten." }, { status: 400 });
  }

  if (sanitized.length > KI_MAX_MESSAGES_PER_REQUEST) {
    return Response.json(
      { error: "Chat-Verlauf ist zu lang." },
      { status: 400 }
    );
  }

  const userCount = countUserMessages(sanitized);
  if (userCount > KI_MAX_USER_MESSAGES) {
    return Response.json(
      {
        error: `Maximal ${KI_MAX_USER_MESSAGES} Nachrichten pro Chat.`,
        typ: "limit_reached",
      },
      { status: 429 }
    );
  }

  const lastUserMessage =
    [...sanitized].reverse().find((m) => m.role === "user")?.content ?? "";

  if (isObviousOffTopic(lastUserMessage)) {
    const offTopicPayload = {
      typ: "off_topic" as const,
      antwort: KI_OFF_TOPIC_REPLY,
    };
    if (isSupabaseConfigured()) {
      try {
        await supabaseAdmin.from("ki_anfragen_log").insert({
          session_id: body.session_id ?? null,
          anfrage_text: lastUserMessage,
          claude_antwort: JSON.stringify(offTopicPayload),
          typ: "off_topic",
          extrahiertes_json: offTopicPayload,
        });
      } catch (logErr) {
        console.error("[ki-rechner] Supabase log failed:", logErr);
      }
    }
    return Response.json({
      parsed: offTopicPayload,
      typ: "off_topic",
      displayText: KI_OFF_TOPIC_REPLY,
    });
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model:
        process.env.CLAUDE_MODEL?.trim() || "claude-sonnet-4-6",
      max_tokens: 1024,
      system: getKiRechnerSystemPrompt(),
      messages: sanitized,
    });

    const block = response.content[0];
    const content =
      block?.type === "text" ? block.text : "";

    let { parsed, typ } = parseKiResponseContent(content);

    /** Kurz/unklar ≠ Off-Topic (z. B. „Schmarrn“, „Hallo“) — freundlich nachfragen. */
    if (
      typ === "off_topic" &&
      lastUserMessage.trim().length < 32 &&
      !isObviousOffTopic(lastUserMessage)
    ) {
      typ = "chat";
      parsed = null;
    }

    let displayText = getKiAssistantDisplayText(content, parsed, typ);
    displayText = correctSuspiciousKiPrices(displayText, lastUserMessage);
    if (
      parsed &&
      "antwort" in parsed &&
      typeof parsed.antwort === "string"
    ) {
      const fixed = correctSuspiciousKiPrices(parsed.antwort, lastUserMessage);
      if (fixed !== parsed.antwort) {
        parsed = { ...parsed, antwort: fixed };
      }
    }

    if (isSupabaseConfigured()) {
      try {
        await supabaseAdmin.from("ki_anfragen_log").insert({
          session_id: body.session_id ?? null,
          anfrage_text: lastUserMessage,
          claude_antwort: content,
          typ,
          extrahiertes_json: parsed ?? null,
        });
      } catch (logErr) {
        console.error("[ki-rechner] Supabase log failed:", logErr);
      }
    }

    return Response.json({
      parsed,
      typ,
      displayText,
    });
  } catch (err) {
    console.error("[ki-rechner] Claude API error:", err);
    return Response.json(
      { error: "Die KI-Antwort konnte gerade nicht geladen werden." },
      { status: 502 }
    );
  }
}
