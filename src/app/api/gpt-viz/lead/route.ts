import { GPT_VIZ_RATE } from "@/lib/gpt-viz/constants";
import { getGptVizSession } from "@/lib/gpt-viz/session";
import { persistLead } from "@/lib/lead/persist-lead";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip, GPT_VIZ_RATE.leadPerHour, 60 * 60 * 1000, "gpt-viz-lead");
  if (!rl.allowed) {
    return Response.json({ error: "Zu viele Anfragen — bitte später erneut." }, { status: 429 });
  }

  let body: {
    session_id?: string;
    name?: string;
    email?: string;
    telefon?: string;
    plz?: string;
    notizen?: string;
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

  const bereiche = session.raum_analyse?.raum_typ
    ? [session.raum_analyse.raum_typ]
    : ["umbau"];

  const result = await persistLead({
    name: body.name,
    email: body.email,
    telefon: body.telefon,
    plz: body.plz,
    notizen: body.notizen,
    situation: "erneuern",
    bereiche,
    kanal: "website",
    funnel_quelle: session.funnel_quelle,
    funnel_daten: {
      projekt_studio: true,
      gpt_session_id: session.id,
      raum_analyse: session.raum_analyse,
      wunsch_text: session.wunsch_text,
      ist_bilder_urls: session.ist_bilder_urls,
      ergebnis_bild_url: session.ergebnis_bild_url,
      ergebnis_historie: session.ergebnis_historie,
      gpt_erklaerung: session.gpt_erklaerung,
      ki_chat_verlauf: session.ki_chat_verlauf,
    },
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  return Response.json({ ok: true, lead_id: result.id });
}
