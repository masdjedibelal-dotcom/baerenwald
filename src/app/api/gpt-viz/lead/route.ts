import { GPT_VIZ_RATE } from "@/lib/gpt-viz/constants";
import { gptVizFunnelDatenFromSession } from "@/lib/gpt-viz/funnel-daten";
import { getGptVizSession, updateGptVizSession } from "@/lib/gpt-viz/session";
import { ensureZielbildForSession } from "@/lib/gpt-viz/zielbild-export";
import { persistLead } from "@/lib/lead/persist-lead";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip, GPT_VIZ_RATE.leadPerHour, 60 * 60 * 1000, "gpt-viz-lead-ddos");
  if (!rl.allowed) {
    return Response.json({ error: "Zu viele Anfragen — bitte kurz warten." }, { status: 429 });
  }

  let body: {
    session_id?: string;
    name?: string;
    email?: string;
    telefon?: string;
    strasse?: string;
    hausnummer?: string;
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

  let session = await getGptVizSession(sessionId);
  if (!session) {
    return Response.json({ error: "Session ungültig oder abgelaufen." }, { status: 404 });
  }

  if (!session.zielbild_url && session.ergebnis_bild_url && session.gpt_erklaerung) {
    await ensureZielbildForSession(session);
    session = (await getGptVizSession(sessionId)) ?? session;
  }

  const bereiche = session.raum_analyse?.raum_typ
    ? [session.raum_analyse.raum_typ]
    : ["umbau"];

  const result = await persistLead({
    name: body.name,
    email: body.email,
    telefon: body.telefon,
    plz: body.plz,
    strasse: body.strasse,
    hausnummer: body.hausnummer,
    notizen: body.notizen,
    situation: "erneuern",
    bereiche,
    kanal: "website",
    funnel_quelle: session.funnel_quelle,
    funnel_daten: gptVizFunnelDatenFromSession(session),
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  const leadSubmittedAt = new Date().toISOString();
  await updateGptVizSession(sessionId, {
    lead_submitted_at: session.lead_submitted_at ?? leadSubmittedAt,
  });

  return Response.json({
    ok: true,
    lead_id: result.id,
    renders_unlocked: true,
    max_renders_after_lead: 3,
  });
}
