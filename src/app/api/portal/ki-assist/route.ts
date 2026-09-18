import { NextResponse } from "next/server";

import {
  createAnthropicClient,
  getClaudeApiKey,
  getClaudeModel,
  KI_CLAUDE_MODEL_FALLBACKS,
} from "@/lib/ki-rechner/claude-config";
import {
  buildPortalKiAssistSystemPrompt,
  isPortalKiAssistScope,
  parsePortalKiAssistDraft,
  PORTAL_KI_ASSIST_SCOPES,
  type PortalKiAssistMessage,
  type PortalKiAssistScope,
} from "@/lib/portal/ki-assist";
import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 45;

type Body = {
  scope?: string;
  fieldLabel?: string;
  currentText?: string;
  contextHint?: string | null;
  messages?: PortalKiAssistMessage[];
  userMessage?: string;
};

/**
 * POST /api/portal/ki-assist
 * Kontextbezogener Feld-Chat (Funnel / Bautagebuch / Abnahme) mit bw-apply Draft.
 */
export async function POST(request: Request) {
  const apiKey = getClaudeApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "KI nicht konfiguriert." },
      { status: 503 }
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Ungültiger Body." },
      { status: 400 }
    );
  }

  const scopeRaw = String(body.scope ?? "").trim();
  if (!isPortalKiAssistScope(scopeRaw)) {
    return NextResponse.json(
      {
        ok: false,
        error: "scope ungültig (funnel_beschreibung|bautagebuch|abnahmeprotokoll|hm_befund_notiz).",
      },
      { status: 400 }
    );
  }
  const scope: PortalKiAssistScope = scopeRaw;
  const cfg = PORTAL_KI_ASSIST_SCOPES[scope];

  if (cfg.requiresPartnerAuth) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) {
      return NextResponse.json(
        { ok: false, error: "Nicht angemeldet." },
        { status: 401 }
      );
    }
    const link = await linkPortalHandwerkerToAuthUser({
      userId: user.id,
      email: user.email,
    });
    if (!link.ok) {
      return NextResponse.json(
        { ok: false, error: link.error },
        { status: 403 }
      );
    }
  } else if (scope === "hm_befund_notiz") {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) {
      return NextResponse.json(
        { ok: false, error: "Nicht angemeldet." },
        { status: 401 }
      );
    }
  }

  const ip = getClientIp(request);
  const bucket = cfg.requiresPartnerAuth
    ? "portal-ki-assist-partner"
    : "portal-ki-assist-funnel";
  const limit = cfg.requiresPartnerAuth ? 60 : 30;
  const { allowed } = checkRateLimit(ip, limit, 60 * 60 * 1000, bucket);
  if (!allowed) {
    return NextResponse.json(
      { ok: false, error: "Zu viele Anfragen — bitte später erneut." },
      { status: 429 }
    );
  }

  const userMessage = String(body.userMessage ?? "").trim();
  if (userMessage.length < 1) {
    return NextResponse.json(
      { ok: false, error: "Bitte eine Nachricht eingeben." },
      { status: 400 }
    );
  }
  if (userMessage.length > 4000) {
    return NextResponse.json(
      { ok: false, error: "Nachricht zu lang." },
      { status: 400 }
    );
  }

  const fieldLabel =
    String(body.fieldLabel ?? "").trim() || cfg.label;
  const currentText = String(body.currentText ?? "").slice(0, 8000);
  const contextHint =
    typeof body.contextHint === "string"
      ? body.contextHint.slice(0, 2000)
      : null;

  const history = Array.isArray(body.messages) ? body.messages : [];
  const trimmedHistory = history
    .filter(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim()
    )
    .slice(-12)
    .map((m) => ({
      role: m.role,
      content: m.content.trim().slice(0, 6000),
    }));

  const system = buildPortalKiAssistSystemPrompt({
    scope,
    fieldLabel,
    currentText,
    contextHint,
  });

  const client = createAnthropicClient(apiKey);
  const models = [getClaudeModel(), ...KI_CLAUDE_MODEL_FALLBACKS];

  const claudeMessages = [
    ...trimmedHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: userMessage },
  ];

  let lastError = "KI-Antwort fehlgeschlagen.";
  for (const model of models) {
    try {
      const res = await client.messages.create({
        model,
        max_tokens: 1500,
        system,
        messages: claudeMessages,
      });
      const block = res.content.find((c) => c.type === "text");
      const reply =
        block && block.type === "text" ? block.text.trim() : "";
      if (!reply) {
        lastError = "Leere KI-Antwort.";
        continue;
      }
      const draft = parsePortalKiAssistDraft(reply);
      return NextResponse.json({
        ok: true,
        reply,
        draftText: draft?.text ?? null,
        draftTitel: draft?.titel ?? null,
      });
    } catch (err) {
      lastError =
        err instanceof Error ? err.message : "KI-Antwort fehlgeschlagen.";
    }
  }

  return NextResponse.json({ ok: false, error: lastError }, { status: 502 });
}
