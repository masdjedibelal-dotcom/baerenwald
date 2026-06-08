import type {
  GptProjektBrief,
  GptVizBauErklaerung,
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
    raum_analyse: (raw.raum_analyse as GptVizRaumAnalyse | null) ?? null,
    wunsch_text: (raw.wunsch_text as string | null) ?? null,
    render_prompt: (raw.render_prompt as string | null) ?? null,
    ergebnis_bild_url: (raw.ergebnis_bild_url as string | null) ?? null,
    ergebnis_historie: Array.isArray(raw.ergebnis_historie)
      ? (raw.ergebnis_historie as GptVizRenderVersion[])
      : [],
    gpt_erklaerung: (raw.gpt_erklaerung as GptVizBauErklaerung | null) ?? null,
    render_count: Number(raw.render_count ?? 0),
    ki_chat_verlauf: Array.isArray(raw.ki_chat_verlauf)
      ? (raw.ki_chat_verlauf as GptVizChatMessage[])
      : [],
    funnel_quelle: (raw.funnel_quelle as GptVizFunnelQuelle) ?? "gpt_raumvisualisierung",
    created_at: String(raw.created_at),
    expires_at: String(raw.expires_at),
  };
}

export async function createGptVizSession(): Promise<GptVizSessionRow | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabaseAdmin
    .from("gpt_raum_sessions")
    .insert({})
    .select("*")
    .single();
  if (error || !data) return null;
  return mapRow(data as Record<string, unknown>);
}

export async function getGptVizSession(
  sessionId: string
): Promise<GptVizSessionRow | null> {
  if (!isSupabaseConfigured()) return null;
  const id = sessionId.trim();
  if (!id) return null;
  const { data, error } = await supabaseAdmin
    .from("gpt_raum_sessions")
    .select("*")
    .eq("id", id)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
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
    wunsch_text: session.wunsch_text,
    ist_bilder_urls: session.ist_bilder_urls,
    ergebnis_bild_url: session.ergebnis_bild_url,
    ergebnis_historie: session.ergebnis_historie,
    gpt_erklaerung: session.gpt_erklaerung,
    render_count: session.render_count,
    ki_chat_verlauf: session.ki_chat_verlauf,
  };
}
