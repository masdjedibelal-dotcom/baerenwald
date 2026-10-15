

/** Freemium-Limits — Projekt- & Kontobasiert, nicht IP-Stunde */
export const GPT_VIZ_LIMITS = {
  guest: {
    maxRenders: 1,
    maxRendersAfterLead: 3,
    maxAnalyzesPerSession: 2,
  },
  portal: {
    maxRendersPerSession: 5,
    maxRendersPerMonth: 5,
    maxAnalyzesPerSession: 6,
  },
  anonymous: {
    maxSessionsPerWindow: 2,
    sessionWindowDays: 7,
  },
  /** Nur DDoS-Deckel — Nutzer sehen diese Meldung praktisch nie */
  ddos: {
    renderPerHour: 30,
    analyzePerHour: 60,
    leadPerHour: 15,
  },
} as const;

export const GPT_VIZ_STORAGE_BUCKET =
  process.env.GPT_VIZ_STORAGE_BUCKET?.trim() || "gpt-visualisierungen";

export const VIZ_NACHPROMPT_TAGS = [
  "Fliesen heller",
  "Mehr Licht",
  "Wärmer",
  "Minimalistischer",
  "Mehr Holz",
  "Heller (nur Farben)",
  "Näher am Original",
] as const;

export const GPT_VIZ_SESSION_STORAGE_KEY = "baerenwald_gpt_projekt_session_id";
export const GPT_VIZ_VISITOR_TOKEN_KEY = "baerenwald_gpt_visitor_token";

/** Legacy-Alias — DDoS-Deckel */
export const GPT_VIZ_RATE = GPT_VIZ_LIMITS.ddos;

export const GPT_VIZ_SKIP_INTERN_MAIL_QUELLEN = new Set([
  "gpt_raumvisualisierung",
  "gpt_kombiniert",
]);
