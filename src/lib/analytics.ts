import posthog from "posthog-js";

/** Kurzlabel für Lead-/Preis-Events (Situation + Gewerke). */
export function formatTrackLeistung(
  situation: string | null | undefined,
  bereiche: string[]
): string {
  const b = bereiche.filter(Boolean).join(", ");
  const s = situation?.trim() || "";
  if (s && b) return `${s}:${b}`;
  return s || b || "—";
}

export const track = {
  rechnerStart: (leistung?: string) =>
    posthog.capture("rechner_start", { leistung }),

  leistungGewaehlt: (leistung: string, situation: string) =>
    posthog.capture("leistung_gewaehlt", { leistung, situation }),

  rechnerSchritt: (schritt: number, name: string) =>
    posthog.capture("rechner_schritt", {
      schritt_nummer: schritt,
      schritt_name: name,
    }),

  preisAngezeigt: (
    leistung: string,
    preis_min?: number,
    preis_max?: number
  ) =>
    posthog.capture("preis_angezeigt", { leistung, preis_min, preis_max }),

  leadAbgeschickt: (leistung: string) =>
    posthog.capture("lead_abgeschickt", { leistung }),

  preisPerMail: (leistung: string) =>
    posthog.capture("preis_per_mail", { leistung }),

  heroChipKlick: (leistung: string) =>
    posthog.capture("hero_chip_klick", { leistung }),

  abbruch: (schritt: string, leistung?: string) =>
    posthog.capture("funnel_abbruch", { schritt, leistung }),
};

const TRUST_ORDER = [
  "trust_intro",
  "trust_preis",
  "trust_qualitaet",
] as const;

const BW_SCREEN_STEP_LABELS: Record<string, string> = {
  trust_intro: "Trust — Einstieg",
  trust_preis: "Trust — Preis",
  trust_qualitaet: "Trust — Qualität",
  situation: "Situation",
  bereiche: "Bereich / Gewerk",
  umfang: "Umfang",
  zeitpunkt: "Zeitpunkt",
  zugaenglichkeit: "Zugänglichkeit",
  zustand: "Zustand",
  groesse: "Größe / Fläche",
  bad_ausstattung: "Bad — Ausstattung",
  ort: "PLZ / Ort",
  loading: "Preisberechnung",
  result: "Ergebnis",
  lead: "Kontakt",
  "beratung-lead": "Beratungsanfrage",
  ausserhalb: "Außerhalb Einzugsgebiet",
  danke: "Danke",
};

const TAIL_SCREENS = [
  "loading",
  "result",
  "lead",
  "beratung-lead",
  "ausserhalb",
  "danke",
] as const;

/** Fortlaufende Schrittnummer + lesbarer Name für PostHog-Funnel. */
export function bwRechnerSchrittForPosthog(
  screen: string,
  stepSequence: readonly string[]
): { schritt: number; schrittName: string } {
  const schrittName =
    BW_SCREEN_STEP_LABELS[screen] ??
    screen.replace(/_/g, " ").replace(/-/g, " ");

  const ti = TRUST_ORDER.indexOf(screen as (typeof TRUST_ORDER)[number]);
  if (ti >= 0) {
    return { schritt: ti + 1, schrittName };
  }

  const si = stepSequence.indexOf(screen);
  if (si >= 0) {
    return { schritt: TRUST_ORDER.length + si + 1, schrittName };
  }

  const ui = TAIL_SCREENS.indexOf(screen as (typeof TAIL_SCREENS)[number]);
  if (ui >= 0) {
    return {
      schritt: TRUST_ORDER.length + stepSequence.length + ui + 1,
      schrittName,
    };
  }

  return {
    schritt: TRUST_ORDER.length + stepSequence.length + TAIL_SCREENS.length + 1,
    schrittName,
  };
}
