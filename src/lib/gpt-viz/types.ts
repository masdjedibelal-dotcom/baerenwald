export type GptVizStilVorschlag = {
  titel: string;
  kurz: string;
  prompt_de: string;
};

export type GptVizFixElement = {
  id: string;
  label: string;
  preserve_default: boolean;
};

export type GptVizRaumAnalyse = {
  raum_typ: string;
  raum_label: string;
  ist_beschreibung: string;
  erkannte_elemente?: string[];
  fixierte_elemente?: GptVizFixElement[];
  veraenderbare_flaechen?: string[];
  einschaetzung?: string;
  stil_vorschlaege: GptVizStilVorschlag[];
  wunsch_entwurf: string;
};

export type GptVizModus = "auffrischen" | "teilsanierung" | "stil_update";

export type GptVizBrief = {
  modus: GptVizModus;
  struktur_lock: boolean;
  preserve: string[];
  aenderungen: string[];
  beantwortete_fragen: string[];
  nutzer_antworten?: Record<string, string>;
};

export type GptVizPrepareOption = {
  id: string;
  label: string;
  hint?: string;
};

export type GptVizPrepareQuestion = {
  id: string;
  question: string;
  hint?: string;
  options: GptVizPrepareOption[];
};

export type GptVizRenderVersion = {
  url: string;
  wunsch_text: string;
  created_at: string;
};

export type GptVizBauErklaerung = {
  titel: string;
  /** 2–3 Sätze für die Chat-Bubble direkt nach dem Render. */
  chat_kurz: string;
  /** Headline im Zielbild-PNG (z. B. „Dein Weg zum Traumbad“). */
  zielbild_headline: string;
  /** Ein editorialer Satz fürs Zielbild — kurz, share-tauglich. */
  zielbild_teaser?: string;
  /** Kleine Kicker-Zeile über der Headline, z. B. „BADNEU · MÜNCHEN“. */
  zielbild_kicker?: string;
  zusammenfassung: string;
  gewerke: Array<{ name: string; beschreibung: string }>;
  ablauf: string[];
  /** 3 kurze Schritte für Zielbild & Verkauf (ohne Zeitangaben). */
  naechste_schritte: string[];
  hinweis_gu?: string;
  /** CTA-Text auf dem Zielbild (z. B. „Projekt kostenlos anfragen“). */
  cta_text: string;
  preis_hinweis_optional?: string;
};

export type GptVizChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type GptVizFunnelQuelle =
  | "gpt_raumvisualisierung"
  | "gpt_kombiniert"
  | "gpt_beratung";

export type GptVizLimitsInfo = {
  tier: "guest" | "guest_lead" | "portal";
  max_renders: number;
  renders_remaining: number;
  max_analyzes: number;
  analyzes_remaining: number;
  portal_monthly_remaining: number | null;
  lead_unlocked: boolean;
  portal_register_url: string;
};

export type GptVizSessionRow = {
  id: string;
  ist_bilder_urls: string[];
  ziel_bild_url: string | null;
  raum_analyse: GptVizRaumAnalyse | null;
  inspiration_analyse: GptVizRaumAnalyse | null;
  viz_brief: GptVizBrief | null;
  wunsch_text: string | null;
  render_prompt: string | null;
  ergebnis_bild_url: string | null;
  zielbild_url: string | null;
  ergebnis_historie: GptVizRenderVersion[];
  gpt_erklaerung: GptVizBauErklaerung | null;
  render_count: number;
  analyze_count: number;
  lead_submitted_at: string | null;
  kunde_id: string | null;
  visitor_token: string | null;
  ki_chat_verlauf: GptVizChatMessage[];
  funnel_quelle: GptVizFunnelQuelle;
  created_at: string;
  expires_at: string;
};

export type GptProjektBrief = {
  session_id: string;
  funnel_quelle: GptVizFunnelQuelle;
  raum_analyse?: GptVizRaumAnalyse | null;
  inspiration_analyse?: GptVizRaumAnalyse | null;
  viz_brief?: GptVizBrief | null;
  wunsch_text?: string | null;
  ist_bilder_urls: string[];
  ziel_bild_url?: string | null;
  ergebnis_bild_url?: string | null;
  zielbild_url?: string | null;
  ergebnis_historie: GptVizRenderVersion[];
  gpt_erklaerung?: GptVizBauErklaerung | null;
  render_count: number;
  ki_chat_verlauf: GptVizChatMessage[];
  limits?: GptVizLimitsInfo;
};
