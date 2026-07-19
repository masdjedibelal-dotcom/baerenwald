import {
  createAnthropicClient,
  getClaudeApiKey,
  getClaudeModel,
  KI_CLAUDE_MODEL_FALLBACKS,
} from "@/lib/ki-rechner/claude-config";
import { mapKiClaudeErrorToResponse } from "@/lib/ki-rechner/claude-errors";
import {
  countUserMessages,
  isObviousOffTopic,
  KI_MAX_MESSAGES_PER_REQUEST,
  KI_MAX_USER_MESSAGES,
  KI_OFF_TOPIC_REPLY,
  KI_RATE_LIMIT_PER_HOUR,
} from "@/lib/ki-rechner/guards";
import { getGptVizPortalKundeId } from "@/lib/gpt-viz/portal-auth";
import { buildGptStudioSystemPrompt } from "@/lib/gpt-viz/gpt-studio-prompt";
import { buildGptStudioLeadPrompt } from "@/lib/gpt-viz/gpt-studio-lead-prompt";
import { detectGptStudioIntent } from "@/lib/gpt-viz/gpt-studio-intents";
import { classifyKiConversation } from "@/lib/ki-rechner/classify-conversation";
import type { KiParsedBekannt } from "@/lib/ki-rechner/types";
import type { GptLeadDraft, GptLeadField } from "@/lib/gpt-viz/lead-collect";
import { getGptVizSession } from "@/lib/gpt-viz/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

export const runtime = "nodejs";
export const maxDuration = 60;

type ChatMessage = { role: "user" | "assistant"; content: string };

async function buildPriceHandoffFields(
  body: {
    price_handoff_check?: boolean;
    lead_active?: boolean;
    viz_flow_active?: boolean;
  },
  sanitized: ChatMessage[]
) {
  if (!body.price_handoff_check || body.lead_active || body.viz_flow_active) {
    return {};
  }

  try {
    const classified = await classifyKiConversation(sanitized);
    if (!classified) return {};

    const { typ, parsed } = classified;
    if (typ === "bekannt" && parsed?.typ === "bekannt") {
      return {
        priceHandoffTyp: typ,
        priceHandoffParsed: parsed as KiParsedBekannt,
      };
    }
    if (typ === "unbekannt" || typ === "zu_komplex") {
      return { priceHandoffTyp: typ, priceHandoffParsed: parsed };
    }
  } catch (err) {
    console.error("[gpt-studio] price handoff classify failed:", err);
  }

  return {};
}

export async function POST(req: Request) {
  const apiKey = getClaudeApiKey();
  if (!apiKey) {
    return Response.json({ error: "Claude API nicht konfiguriert." }, { status: 503 });
  }

  const ip = getClientIp(req);
  const { allowed } = checkRateLimit(ip, KI_RATE_LIMIT_PER_HOUR, 60 * 60 * 1000, "gpt-studio");
  if (!allowed) {
    return Response.json({ error: "Zu viele Anfragen — bitte später erneut." }, { status: 429 });
  }

  let body: {
    messages?: ChatMessage[];
    gpt_session_id?: string;
    wunsch_text?: string;
    lead_active?: boolean;
    lead_draft?: GptLeadDraft;
    lead_next_field?: GptLeadField;
    viz_flow_active?: boolean;
    price_handoff_check?: boolean;
  };
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
    .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }));

  if (sanitized.length === 0) {
    return Response.json({ error: "Keine gültigen Nachrichten." }, { status: 400 });
  }
  if (sanitized.length > KI_MAX_MESSAGES_PER_REQUEST) {
    return Response.json({ error: "Chat-Verlauf ist zu lang." }, { status: 400 });
  }

  const userCount = countUserMessages(sanitized);
  if (userCount > KI_MAX_USER_MESSAGES) {
    return Response.json(
      { error: `Maximal ${KI_MAX_USER_MESSAGES} Nachrichten pro Chat.` },
      { status: 429 }
    );
  }

  const lastUser = [...sanitized].reverse().find((m) => m.role === "user")?.content ?? "";
  if (isObviousOffTopic(lastUser)) {
    return Response.json({ displayText: KI_OFF_TOPIC_REPLY });
  }

  const sessionId = body.gpt_session_id?.trim();
  let session = sessionId ? await getGptVizSession(sessionId) : null;
  const clientWunsch = body.wunsch_text?.trim();
  if (session && clientWunsch && clientWunsch !== session.wunsch_text?.trim()) {
    session = { ...session, wunsch_text: clientWunsch };
  }

  const leadActive = Boolean(body.lead_active);
  const leadDraft = (body.lead_draft ?? {}) as GptLeadDraft;
  const leadNextField = body.lead_next_field as GptLeadField | undefined;
  const portalKundeId = await getGptVizPortalKundeId();

  const system = leadActive
    ? `${buildGptStudioSystemPrompt(session, portalKundeId)}\n\n${buildGptStudioLeadPrompt(leadDraft, leadNextField ?? null)}`
    : buildGptStudioSystemPrompt(session, portalKundeId);

  const client = createAnthropicClient(apiKey);
  const models = [getClaudeModel(), ...KI_CLAUDE_MODEL_FALLBACKS].filter(
    (m, i, arr) => arr.indexOf(m) === i
  );

  try {
    let response: Awaited<ReturnType<typeof client.messages.create>> | null = null;
    let lastErr: unknown;

    for (const model of models) {
      try {
        response = await client.messages.create({
          model,
          max_tokens: 1024,
          system,
          messages: sanitized,
        });
        break;
      } catch (err) {
        lastErr = err;
        const status = (err as { status?: number }).status;
        if (status === 404) continue;
        throw err;
      }
    }

    if (!response) throw lastErr ?? new Error("Kein Modell verfügbar");

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n")
      .trim();

    const lower = lastUser.toLowerCase();
    const intent = detectGptStudioIntent({
      lastUser: lower,
      leadActive,
      vizFlowActive: Boolean(body.viz_flow_active),
      hasPhoto: Boolean(session?.ist_bilder_urls.length),
      hasWunsch: Boolean(clientWunsch || session?.wunsch_text?.trim()),
      hasRenderResult: Boolean(session?.ergebnis_bild_url),
    });

    return Response.json({
      displayText: text || "Wie kann ich dir weiterhelfen?",
      intent,
      ...(await buildPriceHandoffFields(body, sanitized)),
    });
  } catch (err) {
    const mapped = mapKiClaudeErrorToResponse(err);
    return Response.json({ error: mapped.error }, { status: mapped.status });
  }
}
