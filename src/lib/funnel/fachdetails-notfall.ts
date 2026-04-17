import type { FachdetailQuestionDef } from "@/lib/funnel/fachdetails-questions";

/** Notfall: nur eine Hauptfrage pro Gewerk, keine technischen Folgefragen. */
export const FACHDETAILS_NOTFALL = {
  elektro: {
    id: "elektro_notfall_problem",
    title: "Was passiert genau?",
    inputType: "single",
    options: [
      { value: "sicherung", label: "Sicherung fliegt raus", hint: "" },
      { value: "raum", label: "Strom weg in einem Raum", hint: "" },
      { value: "komplett", label: "Strom komplett weg", hint: "" },
      { value: "steckdose", label: "Steckdose defekt", hint: "" },
      {
        value: "weiss_nicht",
        label: "Weiß ich nicht genau",
        hint: "Wir klären das beim Anruf",
      },
    ],
  } satisfies FachdetailQuestionDef,

  sanitaer: {
    id: "sanitaer_notfall_schwere",
    title: "Wie schlimm ist es?",
    inputType: "single",
    options: [
      { value: "tropft", label: "Tropft nur", hint: "" },
      { value: "laeuft", label: "Läuft konstant", hint: "" },
      {
        value: "spritzt",
        label: "Spritzt stark",
        hint: "",
        warnText:
          "Dreh sofort den Haupthahn zu — dann ruf uns an.",
      },
      {
        value: "weiss_nicht",
        label: "Weiß ich nicht genau",
        hint: "",
      },
    ],
  } satisfies FachdetailQuestionDef,

  heizung: {
    id: "heizung_notfall_problem",
    title: "Was ist das Problem?",
    inputType: "single",
    options: [
      { value: "geht_nicht", label: "Heizung geht nicht an", hint: "" },
      { value: "kein_warmwasser", label: "Kein warmes Wasser", hint: "" },
      {
        value: "geraeusch",
        label: "Ungewöhnliche Geräusche",
        hint: "Klopfen, Rauschen, Pfeifen",
      },
      {
        value: "fehlermeldung",
        label: "Fehlermeldung am Display",
        hint: "",
      },
      {
        value: "weiss_nicht",
        label: "Weiß ich nicht genau",
        hint: "",
      },
    ],
  } satisfies FachdetailQuestionDef,
} as const;

/** Reihenfolge für max. 2 Fachdetail-Blöcke (höchster Einfluss zuerst). */
export const FACHDETAILS_PRIORITAET = [
  "sanitaer",
  "kueche",
  "heizung",
  "elektro",
  "fenster",
  "boden",
  "maler",
  "dach",
  "garten",
] as const;

export type FachdetailGewerkKey = (typeof FACHDETAILS_PRIORITAET)[number];

export function bereichMatchesFachdetailGewerk(
  gewerk: FachdetailGewerkKey,
  bereiche: string[]
): boolean {
  const s = new Set(bereiche);
  switch (gewerk) {
    case "sanitaer":
      return (
        s.has("bad") ||
        s.has("wasser") ||
        s.has("sanitaer") ||
        s.has("feuchtigkeit_schimmel")
      );
    case "kueche":
      return s.has("kueche");
    case "heizung":
      return s.has("heizung");
    case "elektro":
      return s.has("strom") || s.has("elektrik") || s.has("elektro");
    case "maler":
      return (
        s.has("maler") ||
        s.has("streichen") ||
        s.has("waende") ||
        s.has("waende_boeden") ||
        s.has("feuchtigkeit_schimmel")
      );
    case "boden":
      return s.has("boden") || s.has("waende_boeden");
    case "dach":
      return s.has("dach");
    case "fenster":
      return (
        s.has("fenster") ||
        s.has("fenster_tueren") ||
        s.has("fenster_tuer")
      );
    case "garten":
      return (
        s.has("garten") ||
        s.has("gestaltung") ||
        s.has("baum") ||
        s.has("baumarbeiten")
      );
    default:
      return false;
  }
}

/** Alle relevanten Fachdetail-Gewerke (Priorität), max. `max` für die UI. */
export function getAktiveFachdetailGewerke(
  bereiche: string[],
  max: number = 2
): FachdetailGewerkKey[] {
  const relevant = FACHDETAILS_PRIORITAET.filter((g) =>
    bereichMatchesFachdetailGewerk(g, bereiche)
  );
  return relevant.slice(0, max);
}

export function countFachdetailGewerke(bereiche: string[]): number {
  return FACHDETAILS_PRIORITAET.filter((g) =>
    bereichMatchesFachdetailGewerk(g, bereiche)
  ).length;
}
