import type { ChipOption, Situation } from "@/lib/types";

export type ExtraEffect = {
  whenValue: string;
  variant: "info" | "warn";
  text: string;
};

export type ExtraQuestionDef = {
  id: string;
  label: string;
  options: ChipOption[];
  effects?: ExtraEffect[];
};

const RENOV: ExtraQuestionDef[] = [
  {
    id: "extra_renov_wohnen",
    label: "Wohnst du während der Renovierung in der Wohnung?",
    options: [
      { value: "ja_bleibe", label: "Ja, ich bleibe drin" },
      { value: "nein_aus", label: "Nein, ich ziehe kurz aus" },
      { value: "offen", label: "Noch offen" },
    ],
    effects: [
      {
        whenValue: "ja_bleibe",
        variant: "info",
        text: "Bei bewohnter Renovierung planen wir Handwerker gestaffelt — immer nur 1 Raum gleichzeitig gesperrt.",
      },
    ],
  },
  {
    id: "extra_renov_plaene",
    label: "Hast du schon konkrete Vorstellungen?",
    options: [
      { value: "genau", label: "Ja, ich weiß genau was ich will" },
      { value: "beratung", label: "Ich brauche Beratung" },
      { value: "moodboard", label: "Ich habe ein Moodboard" },
    ],
  },
  {
    id: "extra_renov_budget",
    label: "Budget im Kopf?",
    options: [
      { value: "u10", label: "Unter 10.000 €" },
      { value: "10_30", label: "10.000–30.000 €" },
      { value: "30_80", label: "30.000–80.000 €" },
      { value: "offen", label: "Offen" },
    ],
  },
];

const NEUBAU: ExtraQuestionDef[] = [
  {
    id: "extra_neubau_wer",
    label: "Wer zieht ein?",
    options: [
      { value: "familie", label: "Familie mit Kindern" },
      { value: "paar", label: "Paar / Einzelperson" },
      { value: "vermietung", label: "Zur Vermietung" },
    ],
    effects: [
      {
        whenValue: "familie",
        variant: "info",
        text: "Wir empfehlen strapazierfähige Böden und Lärmschutz — wir beraten dich gern.",
      },
    ],
  },
  {
    id: "extra_neubau_budget",
    label: "Budget im Kopf?",
    options: [
      { value: "u20", label: "Unter 20.000 €" },
      { value: "20_50", label: "20.000–50.000 €" },
      { value: "50_100", label: "50.000–100.000 €" },
      { value: "offen", label: "Offen — Qualität zuerst" },
    ],
  },
];

const AKUT: ExtraQuestionDef[] = [
  {
    id: "extra_akut_eigentum",
    label: "Bist du Eigentümer oder Mieter?",
    options: [
      { value: "eigentuemer", label: "Eigentümer" },
      {
        value: "mieter_info",
        label: "Mieter — Vermieter informiert",
      },
      {
        value: "mieter_notfall",
        label: "Mieter — Notfall, keine Zeit",
      },
    ],
    effects: [
      {
        whenValue: "mieter_info",
        variant: "info",
        text: "Gut — für Reparaturen in der Mietwohnung ist der Vermieter meist zuständig. Wir helfen euch koordinieren.",
      },
    ],
  },
  {
    id: "extra_akut_dauer",
    label: "Ist das Problem schon länger bekannt?",
    options: [
      { value: "gerade", label: "Gerade passiert" },
      { value: "tage", label: "Seit ein paar Tagen" },
      { value: "laenger", label: "Schon länger ignoriert" },
    ],
    effects: [
      {
        whenValue: "laenger",
        variant: "warn",
        text: "Länger bestehende Schäden können sich ausgeweitet haben — Besichtigung vor Kostenvoranschlag empfohlen.",
      },
    ],
  },
];

const PFLEGE: ExtraQuestionDef[] = [
  {
    id: "extra_pflege_entscheider",
    label: "Bist du der Entscheider?",
    options: [
      { value: "ja", label: "Ja, ich entscheide" },
      { value: "gemeinsam", label: "Wir entscheiden gemeinsam" },
      { value: "fragen", label: "Ich muss noch fragen" },
    ],
    effects: [
      {
        whenValue: "fragen",
        variant: "info",
        text: "Kein Problem — wir schicken dir das Ergebnis per Mail zum Weiterleiten.",
      },
    ],
  },
  {
    id: "extra_pflege_vorher",
    label: "Hattest du schon mal einen Pflegedienst?",
    options: [
      { value: "zufrieden", label: "Ja, war zufrieden" },
      {
        value: "unzufrieden",
        label: "Ja, war unzufrieden oder zu teuer",
      },
      { value: "nein", label: "Nein, erstes Mal" },
    ],
    effects: [
      {
        whenValue: "unzufrieden",
        variant: "info",
        text: "Was war das Problem? Wir hören zu — schreib es uns kurz in die Anmerkungen.",
      },
    ],
  },
];

const B2B: ExtraQuestionDef[] = [
  {
    id: "extra_b2b_lauf",
    label: "Wie läuft das aktuell?",
    options: [
      { value: "intern", label: "Wir haben intern jemanden" },
      { value: "extern", label: "Wir haben externen Dienstleister" },
      { value: "gar_nicht", label: "Gar nicht geregelt" },
    ],
    effects: [
      {
        whenValue: "gar_nicht",
        variant: "warn",
        text: "Ohne Winterdienst-Vertrag haften Sie persönlich bei Unfällen auf Ihrem Gehweg.",
      },
    ],
  },
  {
    id: "extra_b2b_prio",
    label: "Was ist euch am wichtigsten?",
    options: [
      { value: "zuverlaessigkeit", label: "Zuverlässigkeit" },
      { value: "preis", label: "Preis" },
      { value: "reaktion", label: "Reaktionszeit" },
      { value: "alles", label: "Alles aus einer Hand" },
    ],
  },
];

const BY_SIT: Record<Situation, ExtraQuestionDef[]> = {
  renovierung: RENOV,
  neubau: NEUBAU,
  akut: AKUT,
  pflege: PFLEGE,
  b2b: B2B,
};

export function getExtraQuestions(s: Situation | null): ExtraQuestionDef[] {
  if (!s) return [];
  return BY_SIT[s];
}

export function extraQuestionCount(s: Situation | null): number {
  return getExtraQuestions(s).length;
}
