import { enrichBriefWithLimits } from "@/lib/gpt-viz/limits";
import { getGptVizPortalKundeId } from "@/lib/gpt-viz/portal-auth";
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

  const portalKundeId = await getGptVizPortalKundeId();
  const brief = await enrichBriefWithLimits(
    session,
    sessionToBrief(session),
    portalKundeId
  );

  return Response.json({ brief });
}
