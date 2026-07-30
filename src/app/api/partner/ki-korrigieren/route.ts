import { NextResponse } from "next/server";

import {
  createAnthropicClient,
  getClaudeApiKey,
  getClaudeModel,
  KI_CLAUDE_MODEL_FALLBACKS,
} from "@/lib/ki-rechner/claude-config";
import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

type Scope = "bautagebuch" | "abnahmeprotokoll";

type Body = {
  scope?: string;
  rohtext?: string;
  kontext?: {
    leistungName?: string | null;
    auftragTitel?: string | null;
  };
};

function buildSystemPrompt(opts: {
  scope: Scope;
  leistungName: string;
  auftragTitel: string;
}): string {
  return [
    "Du bist Korrektur-Assistent für Handwerker-Dokumentation (Bärenwald).",
    `Kontext: ${opts.scope}, Leistung: ${opts.leistungName}, Auftrag: ${opts.auftragTitel}.`,
    "Formuliere klar, sachlich, deutsch, kurz. Keine erfundenen Fakten.",
    "Nur korrigierter Text, ohne Einleitung.",
  ].join("\n");
}

/**
 * POST /api/partner/ki-korrigieren
 * Body: { scope, rohtext, kontext } → { text }
 */
export async function POST(request: Request) {
  const apiKey = getClaudeApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "KI nicht konfiguriert." },
      { status: 503 }
    );
  }

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

  const ip = getClientIp(request);
  const { allowed } = checkRateLimit(ip, 40, 60 * 60 * 1000, "partner-ki-korrigieren");
  if (!allowed) {
    return NextResponse.json(
      { ok: false, error: "Zu viele Anfragen — bitte später erneut." },
      { status: 429 }
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
  const scope: Scope | null =
    scopeRaw === "bautagebuch" || scopeRaw === "abnahmeprotokoll"
      ? scopeRaw
      : null;
  if (!scope) {
    return NextResponse.json(
      { ok: false, error: "scope ungültig (bautagebuch|abnahmeprotokoll)." },
      { status: 400 }
    );
  }

  const rohtext = String(body.rohtext ?? "").trim();
  if (rohtext.length < 3) {
    return NextResponse.json(
      { ok: false, error: "Bitte zuerst Text eingeben." },
      { status: 400 }
    );
  }
  if (rohtext.length > 8000) {
    return NextResponse.json(
      { ok: false, error: "Text zu lang." },
      { status: 400 }
    );
  }

  const leistungName =
    String(body.kontext?.leistungName ?? "").trim() || "—";
  const auftragTitel =
    String(body.kontext?.auftragTitel ?? "").trim() || "Auftrag";

  const system = buildSystemPrompt({ scope, leistungName, auftragTitel });
  const client = createAnthropicClient(apiKey);
  const models = [getClaudeModel(), ...KI_CLAUDE_MODEL_FALLBACKS];

  let lastError = "KI-Korrektur fehlgeschlagen.";
  for (const model of models) {
    try {
      const res = await client.messages.create({
        model,
        max_tokens: 1024,
        system,
        messages: [{ role: "user", content: rohtext }],
      });
      const block = res.content.find((c) => c.type === "text");
      const text =
        block && block.type === "text" ? block.text.trim() : "";
      if (!text) {
        lastError = "Leere KI-Antwort.";
        continue;
      }
      return NextResponse.json({ ok: true, text });
    } catch (err) {
      lastError =
        err instanceof Error ? err.message : "KI-Korrektur fehlgeschlagen.";
    }
  }

  return NextResponse.json({ ok: false, error: lastError }, { status: 502 });
}
