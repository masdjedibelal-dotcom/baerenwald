export type GptVizStilVorschlag = {
  titel: string;
  kurz: string;
  prompt_de: string;
};

export type GptVizRaumAnalyse = {
  raum_typ: string;
  raum_label: string;
  ist_beschreibung: string;
  erkannte_elemente?: string[];
  einschaetzung?: string;
  stil_vorschlaege: GptVizStilVorschlag[];
  wunsch_entwurf: string;
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

export type GptVizSessionRow = {
  id: string;
  ist_bilder_urls: string[];
  ziel_bild_url: string | null;
  raum_analyse: GptVizRaumAnalyse | null;
  wunsch_text: string | null;
  render_prompt: string | null;
  ergebnis_bild_url: string | null;
  ergebnis_historie: GptVizRenderVersion[];
  gpt_erklaerung: GptVizBauErklaerung | null;
  render_count: number;
  ki_chat_verlauf: GptVizChatMessage[];
  funnel_quelle: GptVizFunnelQuelle;
  created_at: string;
  expires_at: string;
};

export type GptProjektBrief = {
  session_id: string;
  funnel_quelle: GptVizFunnelQuelle;
  raum_analyse?: GptVizRaumAnalyse | null;
  wunsch_text?: string | null;
  ist_bilder_urls: string[];
  ziel_bild_url?: string | null;
  ergebnis_bild_url?: string | null;
  ergebnis_historie: GptVizRenderVersion[];
  gpt_erklaerung?: GptVizBauErklaerung | null;
  render_count: number;
  ki_chat_verlauf: GptVizChatMessage[];
};
