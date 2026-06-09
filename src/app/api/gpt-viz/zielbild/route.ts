import { isGptVizInternalRequest } from "@/lib/gpt-viz/internal-auth";
import { getGptVizSession, getGptVizSessionForStaff } from "@/lib/gpt-viz/session";
import { ensureZielbildForSession } from "@/lib/gpt-viz/zielbild-export";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const internal = isGptVizInternalRequest(req);

  let body: { session_id?: string; force?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Ungültiger JSON-Body." }, { status: 400 });
  }

  const sessionId = String(body.session_id ?? "").trim();
  if (!sessionId) {
    return Response.json({ error: "session_id fehlt." }, { status: 400 });
  }

  const session = internal
    ? await getGptVizSessionForStaff(sessionId)
    : await getGptVizSession(sessionId);

  if (!session) {
    return Response.json({ error: "Session ungültig oder abgelaufen." }, { status: 404 });
  }

  const result = await ensureZielbildForSession(session, { force: Boolean(body.force) });
  if (!result.zielbild_url) {
    return Response.json(
      { error: result.error ?? "Zielbild konnte nicht erzeugt werden." },
      { status: 400 }
    );
  }

  return Response.json({ zielbild_url: result.zielbild_url });
}
