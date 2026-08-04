import type { GptVizSessionRow } from "@/lib/gpt-viz/types";

/** Einheitliches JSON für leads.funnel_daten — Website & CRM. */
export function gptVizFunnelDatenFromSession(session: GptVizSessionRow) {
  return {
    projekt_studio: true,
    gpt_session_id: session.id,
    raum_analyse: session.raum_analyse,
    inspiration_analyse: session.inspiration_analyse,
    viz_brief: session.viz_brief,
    wunsch_text: session.wunsch_text,
    render_prompt: session.render_prompt,
    ist_bilder_urls: session.ist_bilder_urls,
    ziel_bild_url: session.ziel_bild_url,
    ergebnis_bild_url: session.ergebnis_bild_url,
    zielbild_url: session.zielbild_url,
    ergebnis_historie: session.ergebnis_historie,
    gpt_erklaerung: session.gpt_erklaerung,
    ki_chat_verlauf: session.ki_chat_verlauf,
    render_count: session.render_count,
    lead_submitted_at: session.lead_submitted_at,
  };
}
