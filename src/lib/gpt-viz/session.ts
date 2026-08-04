import type {
  GptProjektBrief,
  GptVizBauErklaerung,
  GptVizBrief,
  GptVizChatMessage,
  GptVizFunnelQuelle,
  GptVizRaumAnalyse,
  GptVizRenderVersion,
  GptVizSessionRow,
} from "@/lib/gpt-viz/types";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

function mapRow(raw: Record<string, unknown>): GptVizSessionRow {
  return {
    id: String(raw.id),
    ist_bilder_urls: Array.isArray(raw.ist_bilder_urls)
      ? (raw.ist_bilder_urls as string[])
      : [],
    ziel_bild_url: (raw.ziel_bild_url as string | null) ?? null,
    raum_analyse: (raw.raum_analyse as GptVizRaumAnalyse | null) ?? null,
    inspiration_analyse: (raw.inspiration_analyse as GptVizRaumAnalyse | null) ?? null,
    viz_brief: (raw.viz_brief as GptVizBrief | null) ?? null,
    wunsch_text: (raw.wunsch_text as string | null) ?? null,
    render_prompt: (raw.render_prompt as string | null) ?? null,
    ergebnis_bild_url: (raw.ergebnis_bild_url as string | null) ?? null,
    zielbild_url: (raw.zielbild_url as string | null) ?? null,
    ergebnis_historie: Array.isArray(raw.ergebnis_historie)
      ? (raw.ergebnis_historie as GptVizRenderVersion[])
      : [],
    gpt_erklaerung: (raw.gpt_erklaerung as GptVizBauErklaerung | null) ?? null,
    render_count: Number(raw.render_count ?? 0),
    analyze_count: Number(raw.analyze_count ?? 0),
    lead_submitted_at: (raw.lead_submitted_at as string | null) ?? null,
    kunde_id: (raw.kunde_id as string | null) ?? null,
    visitor_token: (raw.visitor_token as string | null) ?? null,
    ki_chat_verlauf: Array.isArray(raw.ki_chat_verlauf)
      ? (raw.ki_chat_verlauf as GptVizChatMessage[])
      : [],
    funnel_quelle: (raw.funnel_quelle as GptVizFunnelQuelle) ?? "gpt_raumvisualisierung",
    created_at: String(raw.created_at),
    expires_at: String(raw.expires_at),
  };
}

export async function createGptVizSession(opts?: {
  visitor_token?: string | null;
  kunde_id?: string | null;
  funnel_quelle?: GptVizFunnelQuelle;
}): Promise<GptVizSessionRow | null> {
  if (!isSupabaseConfigured()) return null;
  const insert: Record<string, unknown> = {};
  if (opts?.visitor_token) insert.visitor_token = opts.visitor_token;
  if (opts?.kunde_id) insert.kunde_id = opts.kunde_id;
  if (opts?.funnel_quelle) insert.funnel_quelle = opts.funnel_quelle;

  const { data, error } = await supabaseAdmin
    .from("gpt_raum_sessions")
    .insert(insert)
    .select("*")
    .single();
  if (error || !data) return null;
  return mapRow(data as Record<string, unknown>);
}

export async function getGptVizSession(
  sessionId: string
): Promise<GptVizSessionRow | null> {
  return getGptVizSessionRaw(sessionId, { requireActive: true });
}

/** CRM/Intern: Session auch nach Ablauf lesen (z. B. für archivierte Leads). */
export async function getGptVizSessionForStaff(
  sessionId: string
): Promise<GptVizSessionRow | null> {
  return getGptVizSessionRaw(sessionId, { requireActive: false });
}

async function getGptVizSessionRaw(
  sessionId: string,
  opts: { requireActive: boolean }
): Promise<GptVizSessionRow | null> {
  if (!isSupabaseConfigured()) return null;
  const id = sessionId.trim();
  if (!id) return null;
  let query = supabaseAdmin.from("gpt_raum_sessions").select("*").eq("id", id);
  if (opts.requireActive) {
    query = query.gt("expires_at", new Date().toISOString());
  }
  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return mapRow(data as Record<string, unknown>);
}

export async function updateGptVizSession(
  sessionId: string,
  patch: Record<string, unknown>
): Promise<GptVizSessionRow | null> {
  const { data, error } = await supabaseAdmin
    .from("gpt_raum_sessions")
    .update(patch)
    .eq("id", sessionId)
    .select("*")
    .single();
  if (error || !data) return null;
  return mapRow(data as Record<string, unknown>);
}

export function sessionToBrief(session: GptVizSessionRow): GptProjektBrief {
  return {
    session_id: session.id,
    funnel_quelle: session.funnel_quelle,
    raum_analyse: session.raum_analyse,
    inspiration_analyse: session.inspiration_analyse,
    viz_brief: session.viz_brief,
    wunsch_text: session.wunsch_text,
    ist_bilder_urls: session.ist_bilder_urls,
    ziel_bild_url: session.ziel_bild_url,
    ergebnis_bild_url: session.ergebnis_bild_url,
    zielbild_url: session.zielbild_url,
    ergebnis_historie: session.ergebnis_historie,
    gpt_erklaerung: session.gpt_erklaerung,
    render_count: session.render_count,
    ki_chat_verlauf: session.ki_chat_verlauf,
  };
}
