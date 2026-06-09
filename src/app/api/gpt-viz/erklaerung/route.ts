import { generateBauErklaerung } from "@/lib/gpt-viz/claude-bauerklaerung";
import { isGptVizInternalRequest } from "@/lib/gpt-viz/internal-auth";
import {
  getGptVizSession,
  getGptVizSessionForStaff,
  updateGptVizSession,
} from "@/lib/gpt-viz/session";
import { ensureZielbildForSession } from "@/lib/gpt-viz/zielbild-export";
import { getClaudeApiKey } from "@/lib/ki-rechner/claude-config";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!getClaudeApiKey()) {
    return Response.json({ error: "Erklärung nicht verfügbar." }, { status: 503 });
  }

  let body: { session_id?: string };
  try {
    body = (await req.json()) as { session_id?: string };
  } catch {
    return Response.json({ error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const sessionId = String(body.session_id ?? "").trim();
  if (!sessionId) {
    return Response.json({ error: "session_id fehlt." }, { status: 400 });
  }

  const internal = isGptVizInternalRequest(req);
  const session = internal
    ? await getGptVizSessionForStaff(sessionId)
    : await getGptVizSession(sessionId);
  if (!session) {
    return Response.json({ error: "Session ungültig oder abgelaufen." }, { status: 404 });
  }
  if (!session.ergebnis_bild_url) {
    return Response.json({ error: "Zuerst visualisieren." }, { status: 400 });
  }
  if (!session.wunsch_text?.trim()) {
    return Response.json({ error: "Wunschtext fehlt." }, { status: 400 });
  }

  if (session.gpt_erklaerung && session.zielbild_url) {
    return Response.json({
      gpt_erklaerung: session.gpt_erklaerung,
      zielbild_url: session.zielbild_url,
    });
  }

  try {
    let erklaerung = session.gpt_erklaerung;
    if (!erklaerung) {
      erklaerung = await generateBauErklaerung({
        wunschText: session.wunsch_text,
        raumAnalyse: session.raum_analyse,
      });
      const updated = await updateGptVizSession(sessionId, { gpt_erklaerung: erklaerung });
      if (!updated) {
        return Response.json({ error: "Session-Update fehlgeschlagen." }, { status: 500 });
      }
    }

    const withErk = { ...session, gpt_erklaerung: erklaerung };
    const zielbild = await ensureZielbildForSession(withErk);
    return Response.json({
      gpt_erklaerung: erklaerung,
      zielbild_url: zielbild.zielbild_url,
      zielbild_warning: zielbild.error,
    });
  } catch (e) {
    console.error("[gpt-viz/erklaerung]", e);
    return Response.json(
      { error: e instanceof Error ? e.message : "Erklärung fehlgeschlagen." },
      { status: 500 }
    );
  }
}
