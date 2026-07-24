import {
  fallbackVizBrief,
  mergeVizBriefAnswer,
  prepareVizRender,
} from "@/lib/gpt-viz/claude-viz-prepare";
import { isGptVizInternalRequest } from "@/lib/gpt-viz/internal-auth";
import {
  getGptVizSession,
  getGptVizSessionForStaff,
  updateGptVizSession,
} from "@/lib/gpt-viz/session";
import { getClaudeApiKey } from "@/lib/ki-rechner/claude-config";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!getClaudeApiKey()) {
    return Response.json({ error: "KI nicht verfügbar." }, { status: 503 });
  }

  let body: {
    session_id?: string;
    wunsch_text?: string;
    answer?: { question_id: string; option_id: string; option_label: string };
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const sessionId = String(body.session_id ?? "").trim();
  const wunschText = String(body.wunsch_text ?? "").trim();
  if (!sessionId || !wunschText) {
    return Response.json({ error: "session_id und wunsch_text erforderlich." }, { status: 400 });
  }

  const internal = isGptVizInternalRequest(req);
  const session = internal
    ? await getGptVizSessionForStaff(sessionId)
    : await getGptVizSession(sessionId);
  if (!session) {
    return Response.json({ error: "Session ungültig oder abgelaufen." }, { status: 404 });
  }

  let brief = session.viz_brief ?? fallbackVizBrief(session.raum_analyse);

  if (body.answer?.question_id && body.answer.option_id) {
    brief = mergeVizBriefAnswer(
      brief,
      body.answer.question_id,
      body.answer.option_id,
      body.answer.option_label ?? body.answer.option_id
    );
    await updateGptVizSession(sessionId, { viz_brief: brief, wunsch_text: wunschText });
  }

  try {
    const result = await prepareVizRender({
      wunschText,
      istAnalyse: session.raum_analyse,
      inspirationAnalyse: session.inspiration_analyse,
      existingBrief: brief,
    });

    const mergedBrief = {
      ...result.viz_brief,
      beantwortete_fragen: brief.beantwortete_fragen,
      nutzer_antworten: brief.nutzer_antworten,
    };

    await updateGptVizSession(sessionId, {
      viz_brief: mergedBrief,
      wunsch_text: wunschText,
    });

    return Response.json({
      ready: result.ready,
      viz_brief: mergedBrief,
      questions: result.questions,
    });
  } catch (e) {
    console.error("[gpt-viz/prepare-render]", e);
    return Response.json(
      { error: e instanceof Error ? e.message : "Vorbereitung fehlgeschlagen." },
      { status: 500 }
    );
  }
}
