import { analyzeRoomImage } from "@/lib/gpt-viz/claude-analyze-room";
import { GPT_VIZ_RATE } from "@/lib/gpt-viz/constants";
import { getGptVizSession, updateGptVizSession } from "@/lib/gpt-viz/session";
import { resolvePublicImageUrl } from "@/lib/gpt-viz/storage";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { getClaudeApiKey } from "@/lib/ki-rechner/claude-config";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!getClaudeApiKey()) {
    return Response.json({ error: "KI-Analyse nicht verfügbar." }, { status: 503 });
  }

  const ip = getClientIp(req);
  const rl = checkRateLimit(ip, GPT_VIZ_RATE.analyzePerHour, 60 * 60 * 1000, "gpt-viz-analyze");
  if (!rl.allowed) {
    return Response.json({ error: "Zu viele Analysen — bitte später erneut." }, { status: 429 });
  }

  let body: { session_id?: string; image_url?: string };
  try {
    body = (await req.json()) as { session_id?: string; image_url?: string };
  } catch {
    return Response.json({ error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const sessionId = String(body.session_id ?? "").trim();
  const imageUrlInput = String(body.image_url ?? "").trim();
  if (!sessionId) {
    return Response.json({ error: "session_id fehlt." }, { status: 400 });
  }

  const session = await getGptVizSession(sessionId);
  if (!session) {
    return Response.json({ error: "Session ungültig oder abgelaufen." }, { status: 404 });
  }

  const imageUrl = imageUrlInput || session.ist_bilder_urls[0];
  if (!imageUrl) {
    return Response.json({ error: "Kein Bild vorhanden." }, { status: 400 });
  }

  try {
    const publicUrl = resolvePublicImageUrl(imageUrl);
    const analyse = await analyzeRoomImage(publicUrl);
    const updated = await updateGptVizSession(sessionId, {
      raum_analyse: analyse,
      wunsch_text: session.wunsch_text ?? analyse.wunsch_entwurf,
    });
    if (!updated) {
      return Response.json({ error: "Session-Update fehlgeschlagen." }, { status: 500 });
    }
    return Response.json({ raum_analyse: analyse, wunsch_text: updated.wunsch_text });
  } catch (e) {
    console.error("[gpt-viz/analyze-room]", e);
    return Response.json(
      { error: e instanceof Error ? e.message : "Analyse fehlgeschlagen." },
      { status: 500 }
    );
  }
}
