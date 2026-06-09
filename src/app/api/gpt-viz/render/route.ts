import { buildRenderPrompt } from "@/lib/gpt-viz/claude-render-prompt";
import { GPT_VIZ_RATE } from "@/lib/gpt-viz/constants";
import { buildGptVizLimitsInfo, checkRenderLimit } from "@/lib/gpt-viz/limits";
import { getGptVizPortalKundeId } from "@/lib/gpt-viz/portal-auth";
import { portalRegisterForGptUrl } from "@/lib/portal/portal-site-url";
import {
  guidanceScaleForModus,
  negativePromptForBrief,
  promptStrengthForModus,
} from "@/lib/gpt-viz/render-strength";
import { runInteriorDesignRender, isReplicateConfigured } from "@/lib/gpt-viz/replicate-client";
import { fallbackVizBrief } from "@/lib/gpt-viz/claude-viz-prepare";
import { isGptVizInternalRequest } from "@/lib/gpt-viz/internal-auth";
import {
  getGptVizSession,
  getGptVizSessionForStaff,
  updateGptVizSession,
} from "@/lib/gpt-viz/session";
import { resolvePublicImageUrl, uploadGptVizFromUrl } from "@/lib/gpt-viz/storage";
import type { GptVizRenderVersion } from "@/lib/gpt-viz/types";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { getClaudeApiKey } from "@/lib/ki-rechner/claude-config";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  if (!isReplicateConfigured() || !getClaudeApiKey()) {
    const missing = !isReplicateConfigured()
      ? "REPLICATE_API_TOKEN fehlt in den Server-Umgebungsvariablen."
      : "Claude API nicht konfiguriert.";
    return Response.json({ error: `Visualisierung nicht verfügbar: ${missing}` }, { status: 503 });
  }

  const internal = isGptVizInternalRequest(req);
  const portalKundeId = internal ? null : await getGptVizPortalKundeId();

  if (!internal) {
    const ip = getClientIp(req);
    const rl = checkRateLimit(ip, GPT_VIZ_RATE.renderPerHour, 60 * 60 * 1000, "gpt-viz-render-ddos");
    if (!rl.allowed) {
      return Response.json({ error: "Zu viele Anfragen — bitte kurz warten." }, { status: 429 });
    }
  }

  let body: { session_id?: string; wunsch_text?: string; nachprompt?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const sessionId = String(body.session_id ?? "").trim();
  const wunschText = String(body.wunsch_text ?? "").trim();
  const nachprompt = body.nachprompt ? String(body.nachprompt).trim() : undefined;

  if (!sessionId || !wunschText) {
    return Response.json({ error: "session_id und wunsch_text erforderlich." }, { status: 400 });
  }

  const session = internal
    ? await getGptVizSessionForStaff(sessionId)
    : await getGptVizSession(sessionId);
  if (!session) {
    return Response.json({ error: "Session ungültig oder abgelaufen." }, { status: 404 });
  }
  if (!internal) {
    const limit = await checkRenderLimit(session, portalKundeId);
    if (!limit.allowed) {
      return Response.json(
        {
          error: limit.message ?? "Visualisierungs-Limit erreicht.",
          limit_code: limit.code,
          max_renders: limit.max_renders,
          renders_remaining: limit.renders_remaining,
          portal_register_url: portalKundeId ? undefined : portalRegisterForGptUrl(),
        },
        { status: 403 }
      );
    }
  }
  if (session.ist_bilder_urls.length === 0) {
    return Response.json(
      { error: "Für die Visualisierung wird mindestens ein Foto benötigt." },
      { status: 400 }
    );
  }

  try {
    const istUrl = resolvePublicImageUrl(session.ist_bilder_urls[0]);
    const vizBrief = session.viz_brief ?? fallbackVizBrief(session.raum_analyse);
    const renderPrompt = await buildRenderPrompt({
      wunschText,
      raumAnalyse: session.raum_analyse,
      vizBrief,
      nachprompt,
    });

    const replicateUrl = await runInteriorDesignRender({
      imageUrl: istUrl,
      prompt: renderPrompt,
      prompt_strength: promptStrengthForModus(vizBrief.modus, vizBrief.struktur_lock),
      guidance_scale: guidanceScaleForModus(vizBrief.modus),
      negative_prompt: negativePromptForBrief(vizBrief),
    });

    const stored = await uploadGptVizFromUrl(sessionId, replicateUrl);
    const ergebnisUrl = stored.ok ? stored.publicUrl : replicateUrl;

    const version: GptVizRenderVersion = {
      url: ergebnisUrl,
      wunsch_text: wunschText,
      created_at: new Date().toISOString(),
    };
    const historie = [...session.ergebnis_historie, version];

    const updated = await updateGptVizSession(sessionId, {
      wunsch_text: wunschText,
      render_prompt: renderPrompt,
      ergebnis_bild_url: ergebnisUrl,
      ergebnis_historie: historie,
      render_count: session.render_count + 1,
      gpt_erklaerung: null,
    });

    if (!updated) {
      return Response.json({ error: "Session-Update fehlgeschlagen." }, { status: 500 });
    }

    const limitAfter = internal
      ? { max_renders: 999, renders_remaining: 999 }
      : await checkRenderLimit(updated, portalKundeId);

    const limits = internal
      ? null
      : await buildGptVizLimitsInfo(updated, portalKundeId);

    return Response.json({
      ergebnis_bild_url: ergebnisUrl,
      ergebnis_historie: historie,
      render_count: updated.render_count,
      max_renders: limitAfter.max_renders,
      renders_remaining: limitAfter.renders_remaining,
      limits,
    });
  } catch (e) {
    console.error("[gpt-viz/render]", e);
    return Response.json(
      { error: e instanceof Error ? e.message : "Render fehlgeschlagen." },
      { status: 500 }
    );
  }
}
