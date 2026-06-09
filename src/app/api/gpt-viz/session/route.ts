import { GPT_VIZ_LIMITS } from "@/lib/gpt-viz/constants";
import { countVisitorSessionsRecent } from "@/lib/gpt-viz/limits";
import { portalRegisterForGptUrl } from "@/lib/portal/portal-site-url";
import { getGptVizPortalKundeId } from "@/lib/gpt-viz/portal-auth";
import { createGptVizSession } from "@/lib/gpt-viz/session";
import type { GptVizFunnelQuelle } from "@/lib/gpt-viz/types";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Datenbank nicht konfiguriert." }, { status: 503 });
  }

  let body: { visitor_token?: string; funnel_quelle?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  const portalKundeId = await getGptVizPortalKundeId();
  const visitorToken = String(body.visitor_token ?? "").trim() || null;

  if (!portalKundeId && visitorToken) {
    const recent = await countVisitorSessionsRecent(visitorToken);
    if (recent >= GPT_VIZ_LIMITS.anonymous.maxSessionsPerWindow) {
      return Response.json(
        {
          error:
            "Du hast bereits mehrere KI-Projekte gestartet. Registriere dich kostenlos im Portal — dort kannst du weiter visualisieren und Projekte speichern.",
          limit_code: "visitor_sessions",
          portal_register_url: portalRegisterForGptUrl(),
        },
        { status: 429 }
      );
    }
  }

  const funnelQuelle = body.funnel_quelle?.trim() as GptVizFunnelQuelle | undefined;

  const session = await createGptVizSession({
    visitor_token: portalKundeId ? null : visitorToken,
    kunde_id: portalKundeId,
    funnel_quelle: funnelQuelle,
  });

  if (!session) {
    return Response.json({ error: "Session konnte nicht angelegt werden." }, { status: 500 });
  }

  return Response.json({
    session_id: session.id,
    expires_at: session.expires_at,
    tier: portalKundeId ? "portal" : "guest",
  });
}
