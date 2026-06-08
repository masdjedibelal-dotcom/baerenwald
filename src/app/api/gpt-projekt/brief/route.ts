import { getGptVizSession, sessionToBrief } from "@/lib/gpt-viz/session";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("sessionId")?.trim();
  if (!sessionId) {
    return Response.json({ error: "sessionId fehlt." }, { status: 400 });
  }

  const session = await getGptVizSession(sessionId);
  if (!session) {
    return Response.json({ error: "Session ungültig oder abgelaufen." }, { status: 404 });
  }

  return Response.json({ brief: sessionToBrief(session) });
}
