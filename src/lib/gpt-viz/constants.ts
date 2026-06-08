export const GPT_VIZ_MAX_RENDERS = 3;

export const GPT_VIZ_STORAGE_BUCKET =
  process.env.GPT_VIZ_STORAGE_BUCKET?.trim() || "gpt-visualisierungen";

export const REPLICATE_INTERIOR_MODEL =
  "adirik/interior-design:76604baddc85b1b4616e1c6475eca080da339c8875bd4996705440484a6eac38";

export const VIZ_NACHPROMPT_TAGS = [
  "Fliesen heller",
  "Mehr Licht",
  "Wärmer",
  "Minimalistischer",
  "Mehr Holz",
  "Offener",
] as const;

export const GPT_VIZ_SESSION_STORAGE_KEY = "baerenwald_gpt_projekt_session_id";

export const GPT_VIZ_RATE = {
  renderPerHour: 3,
  analyzePerHour: 10,
  leadPerHour: 3,
} as const;

export const GPT_VIZ_SKIP_INTERN_MAIL_QUELLEN = new Set([
  "gpt_raumvisualisierung",
  "gpt_kombiniert",
]);
