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
  optionen: Array<{
    value: string;
    label: string;
    hint?: string;
    icon?: string;
  }>;
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

/**
 * Wasser-Problem auf kanonische IDs (inkl. Legacy-Antworten).
 * - wasser_austritt | von_decke_wand | verstopfung | feucht_ohne_lauf | sonstiges
 */
export function normalizeMeldeWasserProblem(raw: string): string {
  const p = raw.trim().toLowerCase();
  if (
    p === "tropft" ||
    p === "laeuft" ||
    p === "laeuft_stark" ||
    p === "ueberschwemmt"
  ) {
    return "wasser_austritt";
  }
  if (p === "von_decke" || p === "von_oben") return "von_decke_wand";
  if (p === "wc_verstopft" || p === "waschbecken_verstopft") return "verstopfung";
  if (p === "feuchte_wand") return "feucht_ohne_lauf";
  if (
    p === "wasser_austritt" ||
    p === "von_decke_wand" ||
    p === "verstopfung" ||
    p === "feucht_ohne_lauf" ||
    p === "sonstiges"
  ) {
    return p;
  }
  return p || "sonstiges";
}

/**
 * Heizung-Problem auf kanonische IDs (inkl. Legacy).
 * - wohnung_kalt | kein_warmwasser | wasser_am_hk | geraeusche | sonstiges
 */
export function normalizeMeldeHeizungProblem(raw: string): string {
  const p = raw.trim().toLowerCase();
  if (p === "kalt" || p === "nicht_warm") return "wohnung_kalt";
  if (p === "kein_ww") return "kein_warmwasser";
  if (p === "tropft_hk" || p === "wasser_aus") return "wasser_am_hk";
  if (
    p === "wohnung_kalt" ||
    p === "kein_warmwasser" ||
    p === "wasser_am_hk" ||
    p === "geraeusche" ||
    p === "sonstiges"
  ) {
    return p;
  }
  return p || "sonstiges";
}

/**
 * Strom-Problem auf kanonische IDs (inkl. Legacy).
 * - kein_strom | fi_sicherung | einzelner_punkt | klingel | garagentor | sonstiges
 */
export function normalizeMeldeStromProblem(raw: string): string {
  const p = raw.trim().toLowerCase();
  if (p === "steckdose" || p === "licht" || p === "schalter") {
    return "einzelner_punkt";
  }
  if (p === "garagentor_fb") return "garagentor";
  if (
    p === "kein_strom" ||
    p === "fi_sicherung" ||
    p === "einzelner_punkt" ||
    p === "klingel" ||
    p === "garagentor" ||
    p === "sonstiges"
  ) {
    return p;
  }
  return p || "sonstiges";
}

/** Fenster/Tür → kanonische IDs. */
export function normalizeMeldeFensterProblem(raw: string): string {
  const p = raw.trim().toLowerCase();
  if (
    p === "fenster_geht_nicht" ||
    p === "fenster_klemmt" ||
    p === "fenster_undicht" ||
    p === "dichtung"
  ) {
    return "fenster_klemmt_undicht";
  }
  if (p === "glas") return "scheibe_kaputt";
  if (p === "tuer_problem" || p === "tuer_klemmt" || p === "schloss") {
    return "tuer_schloss";
  }
  if (
    p === "fenster_klemmt_undicht" ||
    p === "scheibe_kaputt" ||
    p === "tuer_schloss" ||
    p === "sonstiges"
  ) {
    return p;
  }
  return p || "sonstiges";
}

/** Dach → kanonische IDs. */
export function normalizeMeldeDachProblem(raw: string): string {
  const p = raw.trim().toLowerCase();
  if (p === "rinne" || p === "dachrinne") return "regenrinne_ueber";
  if (p === "fallrohr") return "wasser_fassade";
  if (p === "ziegel") return "ziegel_boden";
  if (p === "dach_undicht") return "sonstiges";
  if (
    p === "regenrinne_ueber" ||
    p === "wasser_fassade" ||
    p === "ziegel_boden" ||
    p === "sonstiges"
  ) {
    return p;
  }
  return p || "sonstiges";
}

/** Schimmel → kanonische IDs (Fassade/Graffiti → sonstiges). */
export function normalizeMeldeSchimmelProblem(raw: string): string {
  const p = raw.trim().toLowerCase();
  if (
    p === "wand_ecke" ||
    p === "bad" ||
    p === "grossflaechig" ||
    p === "feuchte_wand"
  ) {
    return "schimmel_feucht";
  }
  if (p === "fassade" || p === "graffiti") return "sonstiges";
  if (p === "schimmel_feucht" || p === "sonstiges") return p;
  return p || "sonstiges";
}

/** Labels für Alt-Antworten (Anzeige HV), die nicht mehr im Fragebaum stehen. */
const MELDE_WASSER_LEGACY_LABELS: Record<string, string> = {
  tropft: "Wasser tropft",
  laeuft: "Wasser läuft",
  laeuft_stark: "Wasser läuft stark",
  ueberschwemmt: "Überschwemmter Bereich",
  von_decke: "Wasser kommt von der Decke",
  von_oben: "Wasser von oben",
  wc_verstopft: "WC verstopft",
  waschbecken_verstopft: "Waschbecken verstopft",
  feuchte_wand: "Feuchte Wand",
  balkon: "Balkon",
  garage: "Garage",
  flur: "Flur",
  // Heizung legacy
  kalt: "Heizung / Wohnung bleibt kalt",
  nicht_warm: "Heizung wird nicht warm",
  kein_ww: "Kein Warmwasser",
  tropft_hk: "Wasser am Heizkörper",
  wasser_aus: "Wasser am Heizkörper",
  // Strom legacy
  steckdose: "Steckdose funktioniert nicht",
  licht: "Licht funktioniert nicht",
  schalter: "Schalter defekt",
  garagentor_fb: "Garagentor",
  // Fenster legacy
  fenster_geht_nicht: "Fenster geht nicht richtig",
  fenster_klemmt: "Fenster klemmt",
  fenster_undicht: "Fenster undicht",
  glas: "Fensterglas beschädigt",
  tuer_problem: "Tür-Problem",
  tuer_klemmt: "Tür klemmt",
  schloss: "Schloss defekt",
  dichtung: "Dichtung defekt",
  // Dach / Schimmel legacy
  dach_undicht: "Dach undicht",
  rinne: "Dachrinne",
  fallrohr: "Fallrohr",
  ziegel: "Dachziegel",
  fassade: "Fassade / Putz",
  graffiti: "Graffiti",
  // Sonstiges / Baum legacy
  ast_baum: "Ast oder Baum blockiert den Weg",
  astbruch: "Astbruch",
  hecke: "Hecke versperrt den Weg",
  platten: "Gehwegplatten locker",
  laub: "Laub / Schmutz auf dem Weg",
  ungeziefer: "Ungeziefer",
  gemeinschaft: "Gemeinschaftsfläche",
};

const MELDE_LEGACY_ANSWER_LABELS = MELDE_WASSER_LEGACY_LABELS;

/** Fragebäume je Melde-Bereich (Reihenfolge = Anzeige). */
const TREES: Record<MeldeBereichId, MeldeQDef[]> = {
  wasser: [
    {
      id: "melde_problem",
      frage: "Was ist das Problem?",
      optionen: [
        {
          value: "wasser_austritt",
          label: "Wasser tritt aus / läuft / tropft",
          hint: "Leck, tropfender Hahn, nasse Stelle",
          icon: "08-bad",
        },
        {
          value: "von_decke_wand",
          label: "Wasser aus Decke oder Wand",
          hint: "von oben, Flecken, tropft herunter",
          icon: "08-bad",
        },
        {
          value: "verstopfung",
          label: "WC oder Abfluss verstopft",
          hint: "läuft nicht ab, steht, stinkt",
          icon: "08-bad",
        },
        {
          value: "feucht_ohne_lauf",
          label: "Nur feucht — kein laufendes Wasser",
          hint: "Feuchtigkeit, Schimmelgefahr",
          icon: "02-reparatur",
        },
        {
          value: "sonstiges",
          label: "Etwas anderes",
          hint: "kurz beschreiben im nächsten Schritt",
          icon: "02-reparatur",
        },
      ],
    },
    {
      id: "melde_ort",
      frage: "Wo befindet sich der Schaden?",
      optionen: [
        { value: "kueche", label: "Küche" },
        { value: "bad", label: "Bad" },
        { value: "wc", label: "WC" },
        { value: "keller", label: "Keller" },
        { value: "sonstiges", label: "Sonstiges" },
      ],
    },
    {
      id: "melde_laeuft_noch",
      frage: "Kommt gerade aktiv Wasser?",
      optionen: [...JA_NEIN_WEISS],
      showWhen: (a) =>
        problemIs(
          a,
          "wasser_austritt",
          "von_decke_wand",
          "sonstiges",
          // Legacy
          "tropft",
          "laeuft",
          "ueberschwemmt",
          "von_decke",
          "laeuft_stark",
          "von_oben"
        ),
    },
    {
      id: "melde_abstellen",
      frage: "Können Sie das Wasser abstellen?",
      optionen: [...JA_NEIN_WEISS],
      showWhen: (a) =>
        ans(a, "melde_laeuft_noch") === "ja" ||
        ans(a, "melde_laeuft_noch") === "weiss_nicht",
    },
    {
      id: "melde_gefahr",
      frage: "Besteht Gefahr?",
      optionen: [
        { value: "rutsch", label: "Rutschgefahr" },
        { value: "strom", label: "Strom betroffen" },
        { value: "keine", label: "Keine Gefahr" },
      ],
      showWhen: (a) =>
        ans(a, "melde_laeuft_noch") === "ja" ||
        ans(a, "melde_laeuft_noch") === "weiss_nicht" ||
        problemIs(a, "von_decke_wand", "von_decke", "von_oben"),
    },
  ],

  heizung: [
    {
      id: "melde_problem",
      frage: "Was ist das Problem?",
      optionen: [
        {
          value: "wohnung_kalt",
          label: "Wohnung / Heizung bleibt kalt",
          hint: "Heizkörper oder ganze Wohnung",
          icon: "05-heizung",
        },
        {
          value: "kein_warmwasser",
          label: "Kein Warmwasser (Dusche/Hahn kalt)",
          hint: "Warmwasser geht nicht",
          icon: "05-heizung",
        },
        {
          value: "wasser_am_hk",
          label: "Wasser tropft oder läuft am Heizkörper",
          hint: "Leck am Heizkörper oder Ventil",
          icon: "05-heizung",
        },
        {
          value: "geraeusche",
          label: "Knacken / Gluckern / laute Geräusche",
          hint: "ungewöhnliche Geräusche",
          icon: "05-heizung",
        },
        {
          value: "sonstiges",
          label: "Etwas anderes",
          hint: "kurz beschreiben im nächsten Schritt",
          icon: "02-reparatur",
        },
      ],
    },
    {
      id: "melde_heizung_kalt",
      frage: "Wie weit ist es kalt?",
      optionen: [
        { value: "ja", label: "Alles kalt" },
        { value: "einzelne", label: "Nur einzelne Heizkörper" },
        { value: "weiss_nicht", label: "Weiß nicht" },
      ],
      showWhen: (a) =>
        problemIs(a, "wohnung_kalt", "kalt", "nicht_warm"),
    },
    {
      id: "melde_laeuft_noch",
      frage: "Kommt gerade aktiv Wasser am Heizkörper?",
      optionen: [...JA_NEIN_WEISS],
      showWhen: (a) => problemIs(a, "wasser_am_hk", "tropft_hk", "wasser_aus"),
    },
  ],

  strom: [
    {
      id: "melde_problem",
      frage: "Was ist das Problem?",
      optionen: [
        {
          value: "kein_strom",
          label: "Kein Strom in der Wohnung / im Bereich",
          hint: "dunkel, nichts geht",
          icon: "06-elektrik",
        },
        {
          value: "fi_sicherung",
          label: "Sicherung oder FI fliegt raus",
          hint: "springt raus, bleibt nicht an",
          icon: "06-elektrik",
        },
        {
          value: "einzelner_punkt",
          label: "Nur Steckdose, Licht oder Schalter defekt",
          hint: "einzelner Punkt betroffen",
          icon: "06-elektrik",
        },
        {
          value: "klingel",
          label: "Klingel / Türsprecher",
          hint: "klingelt nicht, keine Verbindung",
          icon: "06-elektrik",
        },
        {
          value: "garagentor",
          label: "Garagentor öffnet oder schließt nicht",
          hint: "Tor, Antrieb, Fernbedienung",
          icon: "06-elektrik",
        },
        {
          value: "sonstiges",
          label: "Etwas anderes",
          hint: "kurz beschreiben im nächsten Schritt",
          icon: "02-reparatur",
        },
      ],
    },
    {
      id: "melde_sicherung_raus",
      frage: "Ist im Sicherungskasten etwas rausgeflogen oder ausgeschaltet?",
      optionen: [
        { value: "ja", label: "Ja" },
        { value: "nein", label: "Nein" },
        { value: "weiss_nicht", label: "Weiß nicht / schaue nicht nach" },
      ],
      showWhen: (a) => problemIs(a, "kein_strom", "fi_sicherung"),
    },
    {
      id: "melde_wieder_raus",
      frage:
        "Haben Sie es wieder eingeschaltet — und ist es danach wieder rausgeflogen?",
      optionen: [
        { value: "ja", label: "Ja, wieder rausgeflogen" },
        { value: "nein", label: "Nein, bleibt an / Strom ist wieder da" },
        { value: "weiss_nicht", label: "Nicht versucht / weiß nicht" },
      ],
      showWhen: (a) =>
        problemIs(a, "kein_strom", "fi_sicherung") &&
        ans(a, "melde_sicherung_raus") === "ja",
    },
  ],

  fenster_tuer: [
    {
      id: "melde_problem",
      frage: "Was ist das Problem?",
      optionen: [
        {
          value: "fenster_klemmt_undicht",
          label: "Fenster klemmt oder schließt nicht dicht",
          hint: "schließt nicht, zieht, klemmt",
          icon: "11-fenster",
        },
        {
          value: "scheibe_kaputt",
          label: "Fensterscheibe ist kaputt oder gesprungen",
          hint: "Riss, Bruch, Scheibe",
          icon: "11-fenster",
        },
        {
          value: "tuer_schloss",
          label: "Tür, Schloss oder Schlüssel-Problem",
          hint: "Schloss, Klinke, schließt nicht",
          icon: "11-fenster",
        },
        {
          value: "sonstiges",
          label: "Etwas anderes",
          hint: "kurz beschreiben im nächsten Schritt",
          icon: "02-reparatur",
        },
      ],
    },
    {
      id: "melde_ort_tuer",
      frage: "Wo ist die Tür?",
      optionen: [
        { value: "wohnungstuer", label: "Wohnungstür" },
        { value: "haustuer", label: "Haustür (Haus)" },
        { value: "balkontuer", label: "Balkontür" },
        { value: "sonstiges", label: "Sonstiges" },
      ],
      showWhen: (a) =>
        problemIs(
          a,
          "tuer_schloss",
          "tuer_problem",
          "tuer_klemmt",
          "schloss"
        ),
    },
    {
      id: "melde_geht_zu",
      frage: "Können Sie noch richtig schließen bzw. absperren?",
      optionen: [
        { value: "ja", label: "Ja" },
        { value: "nein", label: "Nein" },
        { value: "mit_kraft", label: "Nur mit Kraft" },
      ],
      showWhen: (a) =>
        problemIs(
          a,
          "tuer_schloss",
          "tuer_problem",
          "tuer_klemmt",
          "schloss",
          "fenster_klemmt_undicht",
          "fenster_geht_nicht",
          "fenster_klemmt",
          "fenster_undicht"
        ),
    },
  ],

  dach: [
    {
      id: "melde_problem",
      frage: "Was ist das Problem?",
      optionen: [
        {
          value: "regenrinne_ueber",
          label: "Die Regenrinne läuft über",
          hint: "überläuft, verstopft",
          icon: "12-dach",
        },
        {
          value: "wasser_fassade",
          label: "Bei Regen kommt Wasser falsch an der Fassade runter",
          hint: "Wasser an der Wand / Fassade",
          icon: "12-dach",
        },
        {
          value: "ziegel_boden",
          label: "Dachziegel liegen am Boden oder fehlen",
          hint: "Ziegel, Dachschaden",
          icon: "12-dach",
        },
        {
          value: "sonstiges",
          label: "Etwas anderes",
          hint: "kurz beschreiben im nächsten Schritt",
          icon: "02-reparatur",
        },
      ],
    },
    {
      id: "melde_bei_regen",
      frage: "Passiert es gerade oder vor allem bei Regen?",
      optionen: [...JA_NEIN_WEISS],
    },
  ],

  schimmel: [
    {
      id: "melde_problem",
      frage: "Was ist das Problem?",
      optionen: [
        {
          value: "schimmel_feucht",
          label: "Schimmel oder feuchte Stellen an Wand / Decke",
          hint: "Flecken, muffig, feucht",
          icon: "02-reparatur",
        },
        {
          value: "sonstiges",
          label: "Etwas anderes (Feuchte)",
          hint: "kurz beschreiben im nächsten Schritt",
          icon: "02-reparatur",
        },
      ],
    },
    {
      id: "melde_ort",
      frage: "Wo ist das?",
      optionen: [
        { value: "bad", label: "Bad" },
        { value: "wohnraum", label: "Wohn- / Schlafzimmer" },
        { value: "keller", label: "Keller" },
        { value: "sonstiges", label: "Sonstiges" },
      ],
    },
  ],

  baum_notfall: [], // Legacy-ID — Fragen laufen über sonstiges (siehe getMeldeDynamicQuestions)

  sonstiges: [
    {
      id: "melde_problem",
      frage: "Was ist das Problem?",
      optionen: [
        {
          value: "muell",
          label: "Mülltonnen voll oder Müll liegt daneben",
          hint: "Müllplatz, Überfüllung",
          icon: "17-gebauedereinigung",
        },
        {
          value: "treppenhaus_schmutz",
          label: "Treppenhaus / Gemeinschaftsbereich schmutzig",
          hint: "Reinigung, Gemeinschaftsfläche",
          icon: "17-gebauedereinigung",
        },
        {
          value: "wespen",
          label: "Wespennest oder Insektennest",
          hint: "Wespen, Insekten",
          icon: "19-notfall",
        },
        {
          value: "weg_aussen",
          label: "Ast, Baum oder Weg draußen blockiert / beschädigt",
          hint: "Außenanlage, Weg, Ast",
          icon: "15-gartenpflege",
        },
        {
          value: "sonstiges",
          label: "Etwas anderes",
          hint: "kurz beschreiben im nächsten Schritt",
          icon: "02-reparatur",
        },
      ],
    },
    {
      id: "melde_ort",
      frage: "Wo ist das?",
      optionen: [
        { value: "muellplatz", label: "Müllplatz / Müllraum" },
        { value: "treppenhaus", label: "Treppenhaus / Eingang" },
        { value: "aussen", label: "Hof / Gehweg / Außenanlage" },
        { value: "keller", label: "Keller" },
        { value: "sonstiges", label: "Sonstiges" },
      ],
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
  const tree =
    bereichId === "baum_notfall"
      ? TREES.sonstiges
      : (TREES[bereichId] ?? TREES.sonstiges);
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

/** Kurze Anzeige-Labels wenn Fragebaum die ID nicht kennt (Rohdaten-Fallback). */
const MELDE_QUESTION_SHORT_LABELS: Record<string, string> = {
  melde_problem: "Problem",
  melde_betrifft: "Betrifft",
  melde_ort: "Ort",
  melde_ort_tuer: "Ort (Tür)",
  melde_ort_schluessel: "Ort (Schlüssel)",
  melde_ort_ziegel: "Ort (Ziegel)",
  melde_ort_fassade: "Ort (Fassade)",
  melde_ort_graffiti: "Ort (Graffiti)",
  melde_ort_hecke: "Ort (Hecke)",
  melde_ort_platten: "Ort (Platten)",
  melde_ort_laub: "Ort (Laub)",
  melde_ort_treppe: "Ort (Treppe)",
  melde_ort_wespen: "Ort (Wespen)",
  melde_seit_wann: "Seit wann",
  melde_seit_wann_akut: "Seit wann",
  melde_laeuft_noch: "Läuft noch",
  melde_abstellen: "Abstellen",
  melde_gefahr: "Gefahr",
  melde_heizung_kalt: "Wohnung kalt",
  melde_warmwasser: "Warmwasser",
  melde_sicherung_raus: "Sicherung raus",
  melde_wieder_raus: "Wieder raus",
  melde_nachbarn_strom: "Nachbarn (Strom)",
  melde_tuer_detail: "Tür-Detail",
  melde_geht_zu: "Geht zu",
  melde_bei_regen: "Bei Regen",
  melde_groesse: "Größe",
  melde_passierbar: "Passierbar",
  melde_staerke: "Stärke",
  melde_wohnung_kalt: "Wohnung kalt",
  melde_nachbarn: "Nachbarn",
  melde_fi: "FI-Schalter",
  melde_stromausfall: "Stromausfall",
  melde_abschliessbar: "Abschließbar",
};

/** Roh-ID → lesbares Label ohne technisches „melde“-Präfix. */
function humanizeMeldeRawKey(id: string): string {
  const bare = id
    .replace(/^melde_/i, "")
    .replace(/_/g, " ")
    .trim();
  if (!bare) return id;
  return bare.charAt(0).toUpperCase() + bare.slice(1);
}

/** Label für gespeicherte Melde-Antwort (Anzeige HV/Kunde). */
export function meldeAnswerDisplayLabel(
  questionId: string,
  value: string | string[] | undefined
): string | null {
  if (value === undefined || value === null || value === "") return null;
  const raw = Array.isArray(value) ? String(value[0] ?? "") : String(value);
  if (!raw) return null;
  for (const tree of Object.values(TREES)) {
    const q = tree.find((x) => x.id === questionId);
    if (!q) continue;
    const opt = q.optionen.find((o) => o.value === raw);
    if (opt) return opt.label;
  }
  if (MELDE_LEGACY_ANSWER_LABELS[raw]) return MELDE_LEGACY_ANSWER_LABELS[raw];
  // Rohdaten-Fallback: keine technischen Slugs mit Unterstrichen
  if (raw.includes("_") || /^melde_/i.test(raw)) {
    return humanizeMeldeRawKey(raw);
  }
  return raw;
}

export function meldeQuestionDisplayLabel(questionId: string): string {
  const id = questionId.trim();
  for (const tree of Object.values(TREES)) {
    const q = tree.find((x) => x.id === id);
    if (q) return q.frage;
  }
  // Rohdaten-Fallback: kurze Labels statt „melde problem“
  const key = id.toLowerCase();
  return MELDE_QUESTION_SHORT_LABELS[key] ?? humanizeMeldeRawKey(id);
}
