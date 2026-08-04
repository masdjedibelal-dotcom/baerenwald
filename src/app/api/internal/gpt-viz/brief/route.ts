import { isGptVizInternalRequest } from "@/lib/gpt-viz/internal-auth";
import { getGptVizSessionForStaff, sessionToBrief } from "@/lib/gpt-viz/session";

export const runtime = "nodejs";

/**
 * GET — CRM: vollständiger GPT-Projekt-Brief inkl. abgelaufener Sessions.
 * Authorization: Bearer GPT_VIZ_INTERNAL_API_SECRET (oder PARTNER_INTERNAL_API_SECRET)
 */
export async function GET(req: Request) {
  if (!isGptVizInternalRequest(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionId = new URL(req.url).searchParams.get("sessionId")?.trim();
  if (!sessionId) {
    return Response.json({ error: "sessionId fehlt." }, { status: 400 });
  }

  const session = await getGptVizSessionForStaff(sessionId);
  if (!session) {
    return Response.json({ error: "Session nicht gefunden." }, { status: 404 });
  }

  return Response.json({ brief: sessionToBrief(session), session });
}
