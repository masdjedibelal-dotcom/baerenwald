/**
 * Melde-kaputt: dynamische Fachfragen — eine nach der anderen,
 * Folgefragen nur wenn nötig (abhängig von Problem-Typ).
 */

import { kaputtBereichToMeldeId } from "@/lib/funnel/melde-bereich-map";
import type { MeldeBereichId } from "@/lib/org/melde-bereiche";
import type { MeldeFachfrageUi } from "@/lib/org/melde-fachdetails";

export type MeldeAnswers = Record<string, string | string[] | undefined>;

type ShowWhen = (a: MeldeAnswers) => boolean;

type MeldeQDef = {
  id: string;
  frage: string;
  optionen: Array<{ value: string; label: string }>;
  /** Wenn gesetzt: Frage nur zeigen, wenn true. */
  showWhen?: ShowWhen;
};

const JA_NEIN = [
  { value: "ja", label: "Ja" },
  { value: "nein", label: "Nein" },
] as const;

const JA_NEIN_WEISS = [
  { value: "ja", label: "Ja" },
  { value: "nein", label: "Nein" },
  { value: "weiss_nicht", label: "Weiß nicht" },
] as const;

const SEIT_WANN = [
  { value: "gerade_eben", label: "Gerade eben" },
  { value: "heute", label: "Heute" },
  { value: "mehrere_tage", label: "Seit mehreren Tagen" },
  { value: "unbekannt", label: "Unbekannt" },
] as const;

const BETRIFFT = [
  { value: "wohnung", label: "Nur meine Wohnung" },
  { value: "mehrere", label: "Mehrere Wohnungen" },
  { value: "gemeinschaft", label: "Gemeinschaftsbereich" },
  { value: "tiefgarage", label: "Tiefgarage" },
  { value: "aussen", label: "Außenbereich" },
] as const;

function ans(a: MeldeAnswers, id: string): string {
  const v = a[id];
  return Array.isArray(v) ? String(v[0] ?? "") : String(v ?? "");
}

function problemIs(a: MeldeAnswers, ...ids: string[]): boolean {
  return ids.includes(ans(a, "melde_problem"));
}

/** Fragebäume je Melde-Bereich (Reihenfolge = Anzeige). */
const TREES: Record<MeldeBereichId, MeldeQDef[]> = {
  wasser: [
    {
      id: "melde_problem",
      frage: "Was ist das Problem?",
      optionen: [
        { value: "tropft", label: "Tropft / kleine Leckage" },
        { value: "laeuft_stark", label: "Läuft stark aus" },
        { value: "wc_verstopft", label: "WC / Abfluss verstopft" },
        { value: "von_oben", label: "Wasser von oben / andere Wohnung" },
        { value: "sonstiges", label: "Sonstiges" },
      ],
    },
    {
      id: "melde_laeuft_noch",
      frage: "Läuft oder tropft aktuell noch Wasser?",
      optionen: [...JA_NEIN_WEISS],
      showWhen: (a) =>
        Boolean(ans(a, "melde_problem")) &&
        !problemIs(a, "wc_verstopft"),
    },
    {
      id: "melde_seit_wann",
      frage: "Seit wann besteht das Problem?",
      optionen: [...SEIT_WANN],
    },
    {
      id: "melde_betrifft",
      frage: "Wo / wen betrifft es?",
      optionen: [
        { value: "wohnung", label: "Nur meine Wohnung" },
        { value: "mehrere", label: "Mehrere Räume oder Wohnungen" },
        { value: "gemeinschaft", label: "Gemeinschaftsbereich" },
      ],
      showWhen: (a) =>
        problemIs(a, "laeuft_stark", "von_oben") ||
        ans(a, "melde_laeuft_noch") === "ja",
    },
  ],

  heizung: [
    {
      id: "melde_problem",
      frage: "Was ist das Problem?",
      optionen: [
        { value: "nicht_warm", label: "Heizung wird nicht warm" },
        { value: "kein_ww", label: "Kein Warmwasser" },
        { value: "geraeusche", label: "Ungewöhnliche Geräusche" },
        { value: "druck", label: "Druck zu niedrig / zu hoch" },
        { value: "sonstiges", label: "Sonstiges" },
      ],
    },
    {
      id: "melde_seit_wann",
      frage: "Seit wann besteht das Problem?",
      optionen: [...SEIT_WANN],
    },
    {
      id: "melde_wohnung_kalt",
      frage: "Ist die ganze Wohnung betroffen (kalt)?",
      optionen: [...JA_NEIN],
      showWhen: (a) => problemIs(a, "nicht_warm"),
    },
  ],

  strom: [
    {
      id: "melde_problem",
      frage: "Was ist das Problem?",
      optionen: [
        { value: "kein_strom", label: "Kein Strom in der Wohnung" },
        { value: "fi_sicherung", label: "Sicherung oder FI-Schalter löst aus" },
        { value: "steckdose", label: "Steckdose ohne Funktion" },
        { value: "licht", label: "Licht funktioniert nicht" },
        { value: "schalter", label: "Schalter defekt" },
        { value: "klingel", label: "Klingel / Gegensprechanlage defekt" },
        { value: "sonstiges", label: "Sonstiges" },
      ],
    },
    {
      id: "melde_seit_wann",
      frage: "Seit wann besteht die Störung?",
      optionen: [...SEIT_WANN],
    },
    {
      id: "melde_betrifft",
      frage: "Betrifft die Störung:",
      optionen: [...BETRIFFT],
      showWhen: (a) =>
        problemIs(a, "kein_strom", "fi_sicherung", "sonstiges"),
    },
    {
      id: "melde_fi",
      frage: "Ist der FI- oder Sicherungsautomat ausgelöst?",
      optionen: [...JA_NEIN_WEISS],
      showWhen: (a) =>
        problemIs(a, "kein_strom", "fi_sicherung", "steckdose", "licht"),
    },
    {
      id: "melde_stromausfall",
      frage: "Gab es einen Stromausfall (auch Nachbarschaft)?",
      optionen: [
        { value: "ja", label: "Ja" },
        { value: "nein", label: "Nein" },
        { value: "unbekannt", label: "Unbekannt" },
      ],
      showWhen: (a) => problemIs(a, "kein_strom"),
    },
  ],

  fenster_tuer: [
    {
      id: "melde_problem",
      frage: "Was ist das Problem?",
      optionen: [
        { value: "fenster_klemmt", label: "Fenster klemmt" },
        { value: "fenster_undicht", label: "Fenster undicht" },
        { value: "glas", label: "Fensterglas beschädigt" },
        { value: "tuer_klemmt", label: "Tür klemmt / schließt nicht" },
        { value: "schloss", label: "Schloss / Zylinder defekt" },
        { value: "dichtung", label: "Dichtung defekt" },
        { value: "sonstiges", label: "Sonstiges" },
      ],
    },
    {
      id: "melde_seit_wann",
      frage: "Seit wann besteht das Problem?",
      optionen: [...SEIT_WANN],
    },
    {
      id: "melde_abschliessbar",
      frage: "Ist die Tür oder das Fenster abschließbar?",
      optionen: [
        { value: "ja", label: "Ja" },
        { value: "nein", label: "Nein" },
        { value: "eingeschraenkt", label: "Eingeschränkt" },
      ],
      showWhen: (a) =>
        problemIs(a, "tuer_klemmt", "schloss", "glas", "sonstiges"),
    },
  ],

  dach: [
    {
      id: "melde_problem",
      frage: "Was ist das Problem?",
      optionen: [
        { value: "dach_undicht", label: "Dach undicht / Wasser dringt ein" },
        { value: "rinne", label: "Dachrinne verstopft oder undicht" },
        { value: "fallrohr", label: "Fallrohr verstopft oder undicht" },
        { value: "ziegel", label: "Dachziegel lose / beschädigt" },
        { value: "sonstiges", label: "Sonstiges" },
      ],
    },
    {
      id: "melde_wasser_ein",
      frage: "Tritt aktuell Wasser ein?",
      optionen: [...JA_NEIN_WEISS],
      showWhen: (a) =>
        problemIs(a, "dach_undicht", "rinne", "fallrohr", "sonstiges"),
    },
    {
      id: "melde_seit_wann",
      frage: "Seit wann besteht das Problem?",
      optionen: [...SEIT_WANN],
    },
    {
      id: "melde_inventar",
      frage: "Sind Möbel oder Inventar gefährdet?",
      optionen: [...JA_NEIN],
      showWhen: (a) =>
        ans(a, "melde_wasser_ein") === "ja" ||
        problemIs(a, "dach_undicht"),
    },
  ],

  schimmel: [
    {
      id: "melde_problem",
      frage: "Wo ist der Schimmel / die Feuchtigkeit?",
      optionen: [
        { value: "wand_ecke", label: "Wand / Ecke" },
        { value: "bad", label: "Bad / feuchter Raum" },
        { value: "grossflaechig", label: "Größere Fläche" },
        { value: "sonstiges", label: "Sonstiges" },
      ],
    },
    {
      id: "melde_flaeche",
      frage: "Ist die Fläche größer als etwa eine Handfläche?",
      optionen: [...JA_NEIN],
    },
    {
      id: "melde_seit_wann",
      frage: "Seit wann besteht das Problem?",
      optionen: [...SEIT_WANN],
    },
    {
      id: "melde_wasserschaden_vorher",
      frage: "Gab es vorher einen Wasserschaden?",
      optionen: [...JA_NEIN_WEISS],
      showWhen: (a) =>
        problemIs(a, "grossflaechig") || ans(a, "melde_flaeche") === "ja",
    },
  ],

  baum_notfall: [
    {
      id: "melde_problem",
      frage: "Was ist das Problem?",
      optionen: [
        { value: "astbruch", label: "Astbruch / herunterhängende Äste" },
        { value: "weg", label: "Weg / Durchgang eingeschränkt" },
        { value: "platten", label: "Gehwegplatten kaputt / locker" },
        { value: "sonstiges", label: "Sonstiges" },
      ],
    },
    {
      id: "melde_gefaehrlich",
      frage: "Ist der Bereich aktuell gefährlich oder kaum passierbar?",
      optionen: [
        { value: "ja", label: "Ja" },
        { value: "nein", label: "Nein" },
        { value: "teilweise", label: "Teilweise" },
      ],
    },
    {
      id: "melde_seit_wann",
      frage: "Seit wann besteht das Problem?",
      optionen: [...SEIT_WANN],
    },
  ],

  sonstiges: [
    {
      id: "melde_problem",
      frage: "Worum geht es ungefähr?",
      optionen: [
        { value: "klingel", label: "Klingel / Gegensprechanlage" },
        { value: "gemeinschaft", label: "Gemeinschaftsfläche" },
        { value: "ungeziefer", label: "Ungeziefer" },
        { value: "sonstiges", label: "Etwas anderes" },
      ],
    },
    {
      id: "melde_eingeschraenkt",
      frage: "Ist die Nutzung der Wohnung eingeschränkt?",
      optionen: [...JA_NEIN],
    },
    {
      id: "melde_seit_wann",
      frage: "Seit wann besteht das Problem?",
      optionen: [...SEIT_WANN],
    },
  ],
};

function toUi(q: MeldeQDef): MeldeFachfrageUi {
  return { id: q.id, frage: q.frage, optionen: q.optionen };
}

/** Aktive Fragen in Reihenfolge — nur sichtbare. */
export function getMeldeDynamicQuestions(
  bereichFunnelValue: string,
  answers: MeldeAnswers | undefined
): MeldeFachfrageUi[] {
  const bereichId = kaputtBereichToMeldeId(bereichFunnelValue);
  const tree = TREES[bereichId] ?? TREES.sonstiges;
  const a = answers ?? {};
  return tree.filter((q) => !q.showWhen || q.showWhen(a)).map(toUi);
}

/** Alle Pflichtfragen der aktuellen Kette beantwortet. */
export function meldeDynamicQuestionsComplete(
  questions: MeldeFachfrageUi[],
  answers: MeldeAnswers | undefined
): boolean {
  if (!questions.length) return true;
  const a = answers ?? {};
  return questions.every((q) => {
    const v = ans(a, q.id);
    return Boolean(v);
  });
}

export function meldeProblemId(answers: MeldeAnswers | undefined): string {
  return ans(answers ?? {}, "melde_problem") || "sonstiges";
}
