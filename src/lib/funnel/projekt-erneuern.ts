import type { FachdetailsState, FunnelState, FunnelStep } from "./types";

/** Top-Level „Ausbau & Umbau“ unter Situation „Zuhause erneuern“. */
export const ERNEUERN_PROJEKT_BEREICHE = [
  "ausbau_dg",
  "ausbau_keller",
  "grundriss_umbau",
  "terrasse_neu",
  "gartengestaltung",
] as const;

export type ErneuernProjektBereich =
  (typeof ERNEUERN_PROJEKT_BEREICHE)[number];

const PROJEKT_SET = new Set<string>(ERNEUERN_PROJEKT_BEREICHE);

export function isErneuernProjektBereich(bereiche: string[]): boolean {
  return bereiche.some((b) => PROJEKT_SET.has(b));
}

export function erneuernProjektTyp(
  bereiche: string[]
): ErneuernProjektBereich | null {
  const hit = bereiche.find((b) => PROJEKT_SET.has(b));
  return (hit as ErneuernProjektBereich) ?? null;
}

/** GU-Banner im Ergebnis: Paket-Preise für alle „Ausbau & Umbau“-Projekt-Kacheln. */
export function zeigtGuProjektPaketBanner(state: FunnelState): boolean {
  return isErneuernProjektBereich(state.bereiche);
}

export const STEP_PROJEKT_TERRASSE_MATERIAL: FunnelStep = {
  id: "projekt_terrasse_material",
  question: "Welches Material soll die Terrasse bekommen?",
  subtext: "Entscheidet über Aufbau und Kostenrahmen",
  inputType: "tiles-single",
  options: [
    {
      value: "holz",
      label: "Holz / WPC",
      hint: "Natürlich oder pflegeleicht",
      emoji: "🪵",
    },
    {
      value: "stein",
      label: "Stein / Platten",
      hint: "Keramik, Naturstein",
      emoji: "🪨",
    },
  ],
};

export const STEP_PROJEKT_TERRASSE_UNTERBAU: FunnelStep = {
  id: "projekt_terrasse_unterbau",
  question: "Ist ein Unterbau / Erdarbeiten erforderlich?",
  subtext:
    "z. B. Höhenausgleich, tragende Schicht, Entwässerung — wir rechnen das im GU-Paket ein",
  inputType: "tiles-single",
  options: [
    {
      value: "ja",
      label: "Ja, notwendig",
      hint: "Größerer Aufwand vor dem Aufbau",
      emoji: "🔧",
    },
    {
      value: "nein",
      label: "Nein / kaum",
      hint: "Bestehende Fläche ist tragfähig",
      emoji: "✓",
    },
  ],
};

export const STEP_PROJEKT_DURCHBRUCH_ANZAHL: FunnelStep = {
  id: "projekt_durchbruch_anzahl",
  question: "Wie viele Durchbrüche sind geplant?",
  inputType: "tiles-single",
  options: [
    { value: "1", label: "Einer", groesse: 1, emoji: "1️⃣" },
    { value: "2", label: "Zwei", groesse: 2, emoji: "2️⃣" },
    {
      value: "3_plus",
      label: "Drei oder mehr",
      groesse: 3,
      emoji: "➕",
    },
  ],
};

export const STEP_PROJEKT_DURCHBRUCH_STATIK: FunnelStep = {
  id: "projekt_durchbruch_statik",
  question: "Sind tragende Wände betroffen?",
  subtext:
    "Tragende Wände erfordern Statik-Check und Stahlträger — der Rahmen ist entsprechend höher",
  inputType: "tiles-single",
  options: [
    {
      value: "tragend",
      label: "Ja, tragend",
      hint: "Statik, Stahlträger, Abfangung",
      emoji: "🏛️",
    },
    {
      value: "nicht_tragend",
      label: "Nein, nicht tragend",
      hint: "Leichtbau oder nicht tragende Trennwand",
      emoji: "🧱",
    },
  ],
};

export const STEP_PROJEKT_AUSBAU_ROHBAU: FunnelStep = {
  id: "projekt_ausbau_rohbau",
  question: "Ist der Rohbau für den Ausbau schon vorhanden?",
  subtext: "Wände und Decke als grober Rohzustand",
  inputType: "tiles-single",
  options: [
    {
      value: "ja",
      label: "Ja — Rohbau vorhanden",
      hint: "Wände und Decke stehen bereits",
      emoji: "✅",
    },
    {
      value: "nein",
      label: "Nein — muss erst erstellt werden",
      hint: "→ ausführliche Planung nötig, automatische Kalkulation nicht möglich",
      emoji: "🏗️",
    },
  ],
};

export const STEP_PROJEKT_AUSBAU_DECKENHOEHE: FunnelStep = {
  id: "projekt_ausbau_deckenhoehe",
  question: "Wie hoch ist die Geschossdecke im Ausbaugebiet?",
  inputType: "tiles-single",
  options: [
    {
      value: "niedrig",
      label: "Unter 2,00 m",
      hint: "Sehr niedrig — eingeschränkte Nutzung",
      emoji: "📏",
    },
    {
      value: "mittel",
      label: "2,00–2,40 m",
      hint: "Normaler Ausbau möglich",
      emoji: "📐",
    },
    {
      value: "hoch",
      label: "Über 2,40 m",
      hint: "Optimale Raumhöhe",
      emoji: "⬆️",
    },
  ],
};

/** Ersetzt `erneuern_groesse` — Screen „groesse“ (Slider m²). */
export const STEP_ERNEUERN_PROJEKT_GROESSE: FunnelStep = {
  id: "erneuern_projekt_groesse",
  question: "Wie groß ist die Projektfläche ungefähr?",
  subtext: "m² — eine grobe Angabe reicht für den ersten Rahmen",
  inputType: "tiles-single",
  options: [
    { value: "s", label: "Bis 25 m²", groesse: 20, emoji: "📐" },
    { value: "m", label: "25–60 m²", groesse: 42, emoji: "📐" },
    { value: "l", label: "60–120 m²", groesse: 90, emoji: "📐" },
    { value: "xl", label: "Über 120 m²", groesse: 140, emoji: "📐" },
  ],
};

/** Gartengestaltung: Fläche — gleiche Kacheln wie andere Projekt-Ausbauten. */
export const STEP_ERNEUERN_PROJEKT_GROESSE_GARTEN: FunnelStep = {
  ...STEP_ERNEUERN_PROJEKT_GROESSE,
  question: "Wie groß ist die Gartenfläche ungefähr?",
  subtext: "m² — für Material- und Lohnkostenrahmen",
};

export const STEP_PROJEKT_GARTEN_ZAUN: FunnelStep = {
  id: "projekt_garten_zaun",
  question: "Soll ein Zaun oder Sichtschutz eingeplant werden?",
  subtext: "Als grobe Pauschale im GU-Rahmen",
  inputType: "tiles-single",
  options: [
    {
      value: "ja",
      label: "Ja",
      hint: "Standard-Zaun grob im Rahmen (+3.500 €)",
      emoji: "🪵",
    },
    {
      value: "nein",
      label: "Nein",
      hint: "Ohne Zaunposition",
      emoji: "✓",
    },
  ],
};

export const STEP_PROJEKT_GARTEN_ZUGANG: FunnelStep = {
  id: "projekt_garten_zugang",
  question: "Wie ist die Zugänglichkeit zur Gartenfläche?",
  subtext:
    "Transport von Material und Maschinen — bei „schwer“ rechnen wir Aufwand für die Lohnseite",
  inputType: "tiles-single",
  options: [
    {
      value: "einfach",
      label: "Einfach",
      hint: "Gute Zufahrt, wenig Hindernisse",
      emoji: "🚗",
    },
    {
      value: "schwer",
      label: "Schwer",
      hint: "Eng, Hang, eingeschränkt — ca. +15 % auf den Lohnanteil",
      emoji: "⚠️",
    },
  ],
};

export function buildErneuernProjektSteps(
  bereiche: string[],
  fd?: FachdetailsState
): FunnelStep[] {
  const typ = erneuernProjektTyp(bereiche);
  if (!typ) return [];

  switch (typ) {
    case "ausbau_dg":
    case "ausbau_keller": {
      const p = fd?.projekt;
      const steps: FunnelStep[] = [STEP_PROJEKT_AUSBAU_ROHBAU];
      if (p?.ausbauRohbau === "ja") {
        steps.push(STEP_PROJEKT_AUSBAU_DECKENHOEHE);
      }
      if (p?.ausbauRohbau === "nein") {
        return steps;
      }
      if (!p?.ausbauRohbau) {
        return steps;
      }
      if (p.ausbauRohbau === "ja") {
        if (!p.ausbauDeckenhoehe) {
          return steps;
        }
        if (p.ausbauDeckenhoehe === "niedrig") {
          return steps;
        }
      }
      steps.push(STEP_ERNEUERN_PROJEKT_GROESSE);
      return steps;
    }
    case "grundriss_umbau":
      return [STEP_PROJEKT_DURCHBRUCH_ANZAHL, STEP_PROJEKT_DURCHBRUCH_STATIK];
    case "terrasse_neu":
      return [
        STEP_PROJEKT_TERRASSE_MATERIAL,
        STEP_PROJEKT_TERRASSE_UNTERBAU,
        STEP_ERNEUERN_PROJEKT_GROESSE,
      ];
    case "gartengestaltung":
      return [
        STEP_ERNEUERN_PROJEKT_GROESSE_GARTEN,
        STEP_PROJEKT_GARTEN_ZAUN,
        STEP_PROJEKT_GARTEN_ZUGANG,
      ];
    default:
      return [];
  }
}
