import type { FachdetailsState, FunnelState, FunnelStep } from "./types";

/** Top-Level „Ausbau & Umbau“ unter Situation „Zuhause erneuern“. */
export const ERNEUERN_PROJEKT_BEREICHE = [
  "ausbau_dg",
  "ausbau_keller",
  "grundriss_umbau",
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
    },
    {
      value: "stein",
      label: "Stein / Platten",
      hint: "Keramik, Naturstein",
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
    },
    {
      value: "nein",
      label: "Nein / kaum",
      hint: "Bestehende Fläche ist tragfähig",
    },
  ],
};

export const STEP_PROJEKT_DURCHBRUCH_ANZAHL: FunnelStep = {
  id: "projekt_durchbruch_anzahl",
  question: "Wie viele Durchbrüche sind geplant?",
  inputType: "tiles-single",
  options: [
    { value: "1", label: "Einer", groesse: 1 },
    { value: "2", label: "Zwei", groesse: 2 },
    {
      value: "3_plus",
      label: "Drei oder mehr",
      groesse: 3,
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
    },
    {
      value: "nicht_tragend",
      label: "Nein, nicht tragend",
      hint: "Leichtbau oder nicht tragende Trennwand",
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
    },
    {
      value: "nein",
      label: "Nein — muss erst erstellt werden",
      hint: "→ ausführliche Planung nötig, automatische Kalkulation nicht möglich",
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
    },
    {
      value: "mittel",
      label: "2,00–2,40 m",
      hint: "Normaler Ausbau möglich",
    },
    {
      value: "hoch",
      label: "Über 2,40 m",
      hint: "Optimale Raumhöhe",
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
    { value: "s", label: "Bis 25 m²", groesse: 20 },
    { value: "m", label: "25–60 m²", groesse: 42 },
    { value: "l", label: "60–120 m²", groesse: 90 },
    { value: "xl", label: "Über 120 m²", groesse: 140 },
  ],
};

/** Gartengestaltung: Leistungsumfang → Preis oder Beratungsweg */
export const STEP_PROJEKT_GARTEN_LEISTUNG: FunnelStep = {
  id: "projekt_garten_leistung",
  question: "Welchen Leistungsumfang planst du?",
  subtext:
    "Von der ersten Idee bis zur Umsetzung — du kannst jederzeit mit einem Beratungstermin starten",
  inputType: "tiles-single",
  options: [
    {
      value: "planung",
      label: "Planung & Beratung",
      hint: "Wir kommen vorbei,\nschauen uns die Fläche\nan und erstellen\ngemeinsam einen Plan.",
    },
    {
      value: "rollrasen",
      label: "Rollrasen & Pflanzung",
      hint: "Schnell grün — Rollrasen und Bepflanzung",
    },
    {
      value: "flaeche_auffrischen",
      label: "Bestehende Fläche auffrischen",
      hint: "Rasen, Beete, kleinere Korrekturen — ohne große Erdarbeiten",
    },
    {
      value: "terrasse",
      label: "Terrasse /\nAußenbereich",
      hint: "Holz, WPC oder\nNaturstein —\ninkl. Unterbau\nund Montage.",
    },
    {
      value: "neuanlage",
      label: "Komplette Neuanlage",
      hint: "Inkl. Erdarbeiten und Neuaufbau — GU-Paket München",
    },
    {
      value: "gu_paket",
      label: "GU-Paket",
      hint: "Koordiniert aus einer Hand — Feste Abläufe und Dokumentation",
    },
  ],
};

/** Gartengestaltung: Terrasse / Außenbereich — Material → €/m² oder Beratung */
export const STEP_PROJEKT_GARTEN_TERRASSE_MATERIAL: FunnelStep = {
  id: "projekt_garten_terrasse_material",
  question: "Welches Material planst du?",
  subtext: "Bestimmt den Preisrahmen — oder wir klären es beim Vor-Ort-Termin",
  inputType: "tiles-single",
  options: [
    {
      value: "holz_wpc",
      label: "Holz / WPC",
      hint: "Natürlich und warm —\npflegeleicht mit WPC",
    },
    {
      value: "naturstein",
      label: "Naturstein /\nPlatten",
      hint: "Langlebig und robust —\nverschiedene Formate",
    },
    {
      value: "noch_offen",
      label: "Noch nicht\nentschieden",
      hint: "Wir beraten beim\nVor-Ort-Termin",
    },
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
  question: "Zaunbau erwünscht?",
  subtext: "Optional — grobe Pauschale im GU-Rahmen",
  inputType: "tiles-single",
  options: [
    {
      value: "ja",
      label: "Ja",
      hint: "Standard-Zaun grob im Rahmen (+3.500 €)",
    },
    {
      value: "nein",
      label: "Nein",
      hint: "Ohne Zaunposition",
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
    },
    {
      value: "schwer",
      label: "Schwer",
      hint: "Eng, Hang, eingeschränkt — ca. +15 % auf den Lohnanteil",
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
    case "gartengestaltung": {
      const p = fd?.projekt;
      const gl = p?.gartenLeistung;

      if (gl === "planung") {
        return [STEP_PROJEKT_GARTEN_LEISTUNG];
      }

      const head: FunnelStep[] = [STEP_PROJEKT_GARTEN_LEISTUNG];

      if (!gl) {
        return head;
      }

      if (gl === "terrasse") {
        const withMat = [...head, STEP_PROJEKT_GARTEN_TERRASSE_MATERIAL];
        const mat = p?.gartenTerrasseMaterial;
        if (!mat || mat === "noch_offen") {
          return withMat;
        }
        return [
          ...withMat,
          STEP_ERNEUERN_PROJEKT_GROESSE_GARTEN,
          STEP_PROJEKT_GARTEN_ZAUN,
          STEP_PROJEKT_GARTEN_ZUGANG,
        ];
      }

      if (
        gl === "rollrasen" ||
        gl === "flaeche_auffrischen" ||
        gl === "neuanlage" ||
        gl === "gu_paket"
      ) {
        return [
          ...head,
          STEP_ERNEUERN_PROJEKT_GROESSE_GARTEN,
          STEP_PROJEKT_GARTEN_ZAUN,
          STEP_PROJEKT_GARTEN_ZUGANG,
        ];
      }

      return head;
    }
    default:
      return [];
  }
}
