import { buildRenderPrompt } from "@/lib/gpt-viz/claude-render-prompt";
import { GPT_VIZ_MAX_RENDERS, GPT_VIZ_RATE } from "@/lib/gpt-viz/constants";
import { runInteriorDesignRender, isReplicateConfigured } from "@/lib/gpt-viz/replicate-client";
import { getGptVizSession, updateGptVizSession } from "@/lib/gpt-viz/session";
import { resolvePublicImageUrl, uploadGptVizFromUrl } from "@/lib/gpt-viz/storage";
import type { GptVizRenderVersion } from "@/lib/gpt-viz/types";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { getClaudeApiKey } from "@/lib/ki-rechner/claude-config";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  if (!isReplicateConfigured() || !getClaudeApiKey()) {
    return Response.json({ error: "Visualisierung nicht verfügbar." }, { status: 503 });
  }

  const ip = getClientIp(req);
  const rl = checkRateLimit(ip, GPT_VIZ_RATE.renderPerHour, 60 * 60 * 1000, "gpt-viz-render");
  if (!rl.allowed) {
    return Response.json({ error: "Render-Limit erreicht — bitte später erneut." }, { status: 429 });
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

  const session = await getGptVizSession(sessionId);
  if (!session) {
    return Response.json({ error: "Session ungültig oder abgelaufen." }, { status: 404 });
  }
  if (session.render_count >= GPT_VIZ_MAX_RENDERS) {
    return Response.json(
      { error: `Maximal ${GPT_VIZ_MAX_RENDERS} Visualisierungen pro Projekt.` },
      { status: 400 }
    );
  }
  if (session.ist_bilder_urls.length === 0) {
    return Response.json(
      { error: "Für die Visualisierung wird mindestens ein Foto benötigt." },
      { status: 400 }
    );
  }

  try {
    const istUrl = resolvePublicImageUrl(session.ist_bilder_urls[0]);
    const renderPrompt = await buildRenderPrompt({
      wunschText,
      raumAnalyse: session.raum_analyse,
      nachprompt,
    });

    const replicateUrl = await runInteriorDesignRender({
      imageUrl: istUrl,
      prompt: renderPrompt,
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

    return Response.json({
      ergebnis_bild_url: ergebnisUrl,
      ergebnis_historie: historie,
      render_count: updated.render_count,
      renders_remaining: GPT_VIZ_MAX_RENDERS - updated.render_count,
    });
  } catch (e) {
    console.error("[gpt-viz/render]", e);
    return Response.json(
      { error: e instanceof Error ? e.message : "Render fehlgeschlagen." },
      { status: 500 }
    );
  }
}
