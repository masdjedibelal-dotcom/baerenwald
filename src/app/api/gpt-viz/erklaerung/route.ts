import { generateBauErklaerung } from "@/lib/gpt-viz/claude-bauerklaerung";
import { getGptVizSession, updateGptVizSession } from "@/lib/gpt-viz/session";
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

  const session = await getGptVizSession(sessionId);
  if (!session) {
    return Response.json({ error: "Session ungültig oder abgelaufen." }, { status: 404 });
  }
  if (!session.ergebnis_bild_url) {
    return Response.json({ error: "Zuerst visualisieren." }, { status: 400 });
  }
  if (!session.wunsch_text?.trim()) {
    return Response.json({ error: "Wunschtext fehlt." }, { status: 400 });
  }

  if (session.gpt_erklaerung) {
    return Response.json({ gpt_erklaerung: session.gpt_erklaerung });
  }

  try {
    const erklaerung = await generateBauErklaerung({
      wunschText: session.wunsch_text,
      raumAnalyse: session.raum_analyse,
    });
    const updated = await updateGptVizSession(sessionId, { gpt_erklaerung: erklaerung });
    if (!updated) {
      return Response.json({ error: "Session-Update fehlgeschlagen." }, { status: 500 });
    }
    return Response.json({ gpt_erklaerung: erklaerung });
  } catch (e) {
    console.error("[gpt-viz/erklaerung]", e);
    return Response.json(
      { error: e instanceof Error ? e.message : "Erklärung fehlgeschlagen." },
      { status: 500 }
    );
  }
}
