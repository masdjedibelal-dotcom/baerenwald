import { getGptVizSession, updateGptVizSession } from "@/lib/gpt-viz/session";
import type { GptVizChatMessage, GptVizFunnelQuelle } from "@/lib/gpt-viz/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: {
    session_id?: string;
    ki_chat_verlauf?: GptVizChatMessage[];
    funnel_quelle?: GptVizFunnelQuelle;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const sessionId = String(body.session_id ?? "").trim();
  if (!sessionId) {
    return Response.json({ error: "session_id fehlt." }, { status: 400 });
  }

  const session = await getGptVizSession(sessionId);
  if (!session) {
    return Response.json({ error: "Session ungültig oder abgelaufen." }, { status: 404 });
  }

  const verlauf = Array.isArray(body.ki_chat_verlauf) ? body.ki_chat_verlauf : [];
  const hasChat = verlauf.length > 0;
  const hasViz =
    session.ist_bilder_urls.length > 0 ||
    Boolean(session.ergebnis_bild_url) ||
    Boolean(session.raum_analyse);

  let funnelQuelle: GptVizFunnelQuelle = session.funnel_quelle;
  if (hasChat && hasViz) {
    funnelQuelle = "gpt_kombiniert";
  } else if (hasChat && !hasViz) {
    funnelQuelle = "gpt_beratung";
  } else if (body.funnel_quelle) {
    funnelQuelle = body.funnel_quelle;
  }

  const updated = await updateGptVizSession(sessionId, {
    ki_chat_verlauf: verlauf,
    funnel_quelle: funnelQuelle,
  });

  if (!updated) {
    return Response.json({ error: "Session-Update fehlgeschlagen." }, { status: 500 });
  }

  return Response.json({
    funnel_quelle: updated.funnel_quelle,
    ki_chat_verlauf_count: updated.ki_chat_verlauf.length,
  });
}
