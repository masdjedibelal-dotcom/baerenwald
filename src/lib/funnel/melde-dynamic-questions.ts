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
        { value: "tropft", label: "Wasser tropft" },
        { value: "laeuft", label: "Wasser läuft" },
        { value: "wc_verstopft", label: "WC verstopft" },
        { value: "waschbecken_verstopft", label: "Waschbecken verstopft" },
        { value: "von_decke", label: "Wasser kommt von der Decke" },
        { value: "feuchte_wand", label: "Feuchte Wand" },
        { value: "ueberschwemmt", label: "Überschwemmter Bereich" },
        { value: "sonstiges", label: "Sonstiges" },
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
        { value: "balkon", label: "Balkon" },
        { value: "garage", label: "Garage" },
        { value: "flur", label: "Flur" },
        { value: "sonstiges", label: "Sonstiges" },
      ],
    },
    {
      id: "melde_seit_wann",
      frage: "Seit wann besteht das Problem?",
      optionen: [...SEIT_WANN],
    },
    {
      id: "melde_laeuft_noch",
      frage: "Läuft aktuell Wasser?",
      optionen: [...JA_NEIN_WEISS],
      showWhen: (a) =>
        problemIs(
          a,
          "tropft",
          "laeuft",
          "von_decke",
          "ueberschwemmt",
          "sonstiges",
          // legacy
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
        problemIs(a, "laeuft", "ueberschwemmt", "laeuft_stark"),
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
        problemIs(
          a,
          "laeuft",
          "ueberschwemmt",
          "von_decke",
          "laeuft_stark",
          "von_oben"
        ) || ans(a, "melde_laeuft_noch") === "ja",
    },
  ],

  heizung: [
    {
      id: "melde_problem",
      frage: "Was ist das Problem?",
      optionen: [
        { value: "kalt", label: "Heizung / Wohnung bleibt kalt" },
        { value: "kein_ww", label: "Kein Warmwasser" },
        { value: "geraeusche", label: "Heizkörper machen Geräusche" },
        {
          value: "tropft_hk",
          label: "Es tropft oder läuft Wasser am Heizkörper",
        },
        { value: "sonstiges", label: "Sonstiges" },
        // Legacy
        { value: "nicht_warm", label: "Heizung wird nicht warm" },
      ],
    },
    {
      id: "melde_betrifft",
      frage: "Betrifft das:",
      optionen: [
        { value: "wohnung", label: "Nur meine Wohnung" },
        { value: "mehrere", label: "Mehrere Wohnungen (soweit ich weiß)" },
        { value: "weiss_nicht", label: "Weiß ich nicht" },
      ],
    },
    {
      id: "melde_seit_wann",
      frage: "Seit wann?",
      optionen: [
        { value: "gerade_eben", label: "Gerade eben" },
        { value: "heute", label: "Heute" },
        { value: "mehrere_tage", label: "Seit mehreren Tagen" },
        { value: "immer_wieder", label: "Immer wieder" },
      ],
    },
    {
      id: "melde_heizung_kalt",
      frage: "Ist die ganze Wohnung kalt?",
      optionen: [
        { value: "ja", label: "Ja, alles kalt" },
        { value: "einzelne", label: "Nur einzelne Zimmer / Heizkörper" },
        { value: "teilweise", label: "Teilweise warm" },
      ],
      showWhen: (a) => problemIs(a, "kalt", "nicht_warm"),
    },
    {
      id: "melde_warmwasser",
      frage: "Kommt aus dem Hahn noch Warmwasser?",
      optionen: [...JA_NEIN_WEISS],
      showWhen: (a) =>
        problemIs(a, "kalt", "nicht_warm", "geraeusche", "tropft_hk"),
    },
  ],

  strom: [
    {
      id: "melde_problem",
      frage: "Was ist das Problem?",
      optionen: [
        { value: "kein_strom", label: "Kein Strom in der Wohnung" },
        { value: "steckdose", label: "Eine Steckdose funktioniert nicht" },
        { value: "licht", label: "Licht funktioniert nicht" },
        {
          value: "klingel",
          label: "Klingel oder Türsprecher funktioniert nicht",
        },
        {
          value: "garagentor",
          label: "Garagentor öffnet oder schließt nicht",
        },
        { value: "sonstiges", label: "Sonstiges" },
        // Legacy
        { value: "fi_sicherung", label: "Sicherung oder FI-Schalter löst aus" },
        { value: "schalter", label: "Schalter defekt" },
      ],
    },
    {
      id: "melde_betrifft",
      frage: "Betrifft das:",
      optionen: [
        { value: "wohnung", label: "Nur meine Wohnung" },
        { value: "treppenhaus", label: "Treppenhaus" },
        { value: "tiefgarage", label: "Tiefgarage" },
        { value: "aussen", label: "Außenbereich" },
      ],
    },
    {
      id: "melde_seit_wann",
      frage: "Seit wann?",
      optionen: [
        { value: "gerade_eben", label: "Gerade eben" },
        { value: "heute", label: "Heute" },
        { value: "mehrere_tage", label: "Seit mehreren Tagen" },
        { value: "immer_wieder", label: "Immer wieder" },
      ],
    },
    {
      id: "melde_sicherung_raus",
      frage:
        "Im Sicherungskasten: Ist etwas rausgeflogen oder ausgeschaltet?",
      optionen: [
        { value: "ja", label: "Ja" },
        { value: "nein", label: "Nein" },
        { value: "weiss_nicht", label: "Weiß ich nicht / schaue nicht nach" },
      ],
      showWhen: (a) =>
        problemIs(
          a,
          "kein_strom",
          "fi_sicherung",
          "steckdose",
          "licht",
          "schalter",
          "sonstiges"
        ),
    },
    {
      id: "melde_wieder_raus",
      frage:
        "Haben Sie es wieder eingeschaltet — und ist es danach wieder rausgeflogen?",
      optionen: [
        { value: "ja", label: "Ja, wieder rausgeflogen" },
        { value: "nein", label: "Nein, bleibt an / Strom ist wieder da" },
        { value: "weiss_nicht", label: "Weiß ich nicht / nicht versucht" },
      ],
      showWhen: (a) =>
        problemIs(a, "kein_strom", "fi_sicherung") &&
        ans(a, "melde_sicherung_raus") === "ja",
    },
    {
      id: "melde_nachbarn_strom",
      frage: "Haben Nachbarn oder das Haus auch keinen Strom?",
      optionen: [...JA_NEIN_WEISS],
      showWhen: (a) => problemIs(a, "kein_strom", "fi_sicherung"),
    },
  ],

  fenster_tuer: [
    {
      id: "melde_problem",
      frage: "Was ist das Problem?",
      optionen: [
        {
          value: "fenster_geht_nicht",
          label:
            "Fenster geht nicht richtig (öffnet/schließt schlecht oder schließt nicht dicht)",
        },
        {
          value: "scheibe_kaputt",
          label: "Fensterscheibe ist kaputt oder gesprungen",
        },
        {
          value: "tuer_problem",
          label:
            "Tür-Problem (schließt nicht, lässt sich nicht absperren, Schlüssel)",
        },
        { value: "sonstiges", label: "Sonstiges" },
        // Legacy
        { value: "fenster_klemmt", label: "Fenster klemmt" },
        { value: "fenster_undicht", label: "Fenster undicht" },
        { value: "glas", label: "Fensterglas beschädigt" },
        { value: "tuer_klemmt", label: "Tür klemmt / schließt nicht" },
        { value: "schloss", label: "Schloss / Zylinder defekt" },
        { value: "dichtung", label: "Dichtung defekt" },
      ],
    },
    {
      id: "melde_tuer_detail",
      frage: "Was genau ist mit der Tür?",
      optionen: [
        {
          value: "schließt",
          label: "Tür schließt nicht richtig / klemmt",
        },
        {
          value: "absperren",
          label: "Tür lässt sich nicht absperren",
        },
        {
          value: "schluessel",
          label: "Schlüssel steckt fest oder ist abgebrochen",
        },
      ],
      showWhen: (a) => problemIs(a, "tuer_problem"),
    },
    {
      id: "melde_ort",
      frage: "Wo ist das?",
      optionen: [
        { value: "zimmerfenster", label: "Fenster im Zimmer" },
        { value: "balkontuer", label: "Balkontür" },
        { value: "kellerfenster", label: "Kellerfenster" },
        { value: "sonstiges", label: "Sonstiges" },
      ],
      showWhen: (a) =>
        problemIs(
          a,
          "fenster_geht_nicht",
          "scheibe_kaputt",
          "fenster_klemmt",
          "fenster_undicht",
          "glas",
          "dichtung"
        ),
    },
    {
      id: "melde_ort_tuer",
      frage: "Wo ist das?",
      optionen: [
        { value: "wohnungstuer", label: "Wohnungstür" },
        { value: "haustuer", label: "Haustür (Haus)" },
        { value: "balkontuer", label: "Balkontür" },
        { value: "kellertuer", label: "Kellertür" },
        { value: "sonstiges", label: "Sonstiges" },
      ],
      showWhen: (a) =>
        problemIs(a, "tuer_klemmt") ||
        (problemIs(a, "tuer_problem") &&
          (ans(a, "melde_tuer_detail") === "schließt" ||
            ans(a, "melde_tuer_detail") === "absperren")),
    },
    {
      id: "melde_ort_schluessel",
      frage: "Wo ist das?",
      optionen: [
        { value: "wohnungstuer", label: "Wohnungstür" },
        { value: "haustuer", label: "Haustür (Haus)" },
        { value: "kellertuer", label: "Kellertür" },
      ],
      showWhen: (a) =>
        (problemIs(a, "tuer_problem") &&
          ans(a, "melde_tuer_detail") === "schluessel") ||
        problemIs(a, "schloss"),
    },
    {
      id: "melde_seit_wann",
      frage: "Seit wann?",
      optionen: [
        { value: "gerade_eben", label: "Gerade eben" },
        { value: "heute", label: "Heute" },
        { value: "mehrere_tage", label: "Seit mehreren Tagen" },
        { value: "schon_laenger", label: "Schon länger" },
      ],
      showWhen: (a) =>
        !(
          (problemIs(a, "tuer_problem") &&
            ans(a, "melde_tuer_detail") === "schluessel") ||
          problemIs(a, "schloss")
        ),
    },
    {
      id: "melde_seit_wann_akut",
      frage: "Seit wann?",
      optionen: [
        { value: "gerade_eben", label: "Gerade eben" },
        { value: "heute", label: "Heute" },
      ],
      showWhen: (a) =>
        (problemIs(a, "tuer_problem") &&
          ans(a, "melde_tuer_detail") === "schluessel") ||
        problemIs(a, "schloss"),
    },
    {
      id: "melde_geht_zu",
      frage: "Geht es noch zu / lässt es sich absperren?",
      optionen: [
        { value: "ja", label: "Ja" },
        { value: "nein", label: "Nein" },
        { value: "mit_kraft", label: "Nur mit Kraft" },
      ],
      showWhen: (a) => {
        if (problemIs(a, "scheibe_kaputt", "glas")) return false;
        if (
          (problemIs(a, "tuer_problem") &&
            ans(a, "melde_tuer_detail") === "schluessel") ||
          problemIs(a, "schloss")
        ) {
          return false;
        }
        return problemIs(
          a,
          "fenster_geht_nicht",
          "tuer_problem",
          "sonstiges",
          "fenster_klemmt",
          "fenster_undicht",
          "tuer_klemmt",
          "dichtung"
        );
      },
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
        },
        {
          value: "wasser_fassade",
          label:
            "Am Haus (Fassade / Ecke) kommt bei Regen Wasser falsch runter",
        },
        {
          value: "ziegel_boden",
          label: "Dachziegel liegen am Boden oder fehlen",
        },
        { value: "sonstiges", label: "Sonstiges" },
        // Legacy
        { value: "dach_undicht", label: "Dach undicht / Wasser dringt ein" },
        { value: "rinne", label: "Dachrinne verstopft oder undicht" },
        { value: "fallrohr", label: "Fallrohr verstopft oder undicht" },
        { value: "ziegel", label: "Dachziegel lose / beschädigt" },
      ],
    },
    {
      id: "melde_ort",
      frage: "Wo merken Sie das?",
      optionen: [
        { value: "fassade", label: "An der Hausfassade" },
        { value: "eingang", label: "Eingangsbereich" },
        { value: "balkon", label: "Balkon" },
        { value: "garage", label: "Garage / Hof" },
        { value: "sonstiges", label: "Sonstiges" },
      ],
      showWhen: (a) =>
        problemIs(
          a,
          "regenrinne_ueber",
          "wasser_fassade",
          "rinne",
          "fallrohr",
          "dach_undicht",
          "sonstiges"
        ),
    },
    {
      id: "melde_ort_ziegel",
      frage: "Wo merken Sie das?",
      optionen: [
        { value: "gehweg", label: "Eingangsbereich / Gehweg" },
        { value: "aussen", label: "Hof / Außenbereich" },
        { value: "garage", label: "Garage" },
        { value: "sonstiges", label: "Sonstiges" },
      ],
      showWhen: (a) => problemIs(a, "ziegel_boden", "ziegel"),
    },
    {
      id: "melde_seit_wann",
      frage: "Seit wann?",
      optionen: [
        { value: "gerade_eben", label: "Gerade eben" },
        { value: "heute", label: "Heute" },
        { value: "mehrere_tage", label: "Seit mehreren Tagen" },
        { value: "bei_regen", label: "Immer wieder bei Regen" },
      ],
    },
    {
      id: "melde_bei_regen",
      frage: "Passiert es vor allem bei Regen oder Wind?",
      optionen: [...JA_NEIN_WEISS],
      showWhen: (a) =>
        problemIs(
          a,
          "regenrinne_ueber",
          "wasser_fassade",
          "sonstiges",
          "rinne",
          "fallrohr",
          "dach_undicht"
        ),
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
        },
        {
          value: "fassade",
          label: "An der Hausfassade: Putz, Risse oder Farbe kaputt",
        },
        {
          value: "graffiti",
          label: "Schmiererei / Graffiti an der Wand",
        },
        { value: "sonstiges", label: "Sonstiges" },
        // Legacy
        { value: "wand_ecke", label: "Wand / Ecke" },
        { value: "bad", label: "Bad / feuchter Raum" },
        { value: "grossflaechig", label: "Größere Fläche" },
      ],
    },
    {
      id: "melde_ort",
      frage: "Wo ist das?",
      optionen: [
        { value: "bad", label: "Bad" },
        { value: "kueche", label: "Küche" },
        { value: "schlafzimmer", label: "Schlafzimmer" },
        { value: "wohnzimmer", label: "Wohnzimmer" },
        { value: "keller", label: "Keller" },
        { value: "treppenhaus", label: "Treppenhaus" },
        { value: "sonstiges", label: "Sonstiges" },
      ],
      showWhen: (a) =>
        problemIs(
          a,
          "schimmel_feucht",
          "wand_ecke",
          "bad",
          "grossflaechig",
          "sonstiges"
        ),
    },
    {
      id: "melde_ort_fassade",
      frage: "Wo ist das?",
      optionen: [
        { value: "aussenfassade", label: "Außenfassade" },
        { value: "eingang", label: "Eingang / Hof" },
        { value: "garage", label: "Garage" },
        { value: "sonstiges", label: "Sonstiges" },
      ],
      showWhen: (a) => problemIs(a, "fassade"),
    },
    {
      id: "melde_ort_graffiti",
      frage: "Wo ist das?",
      optionen: [
        { value: "aussenfassade", label: "Außenfassade" },
        { value: "eingang", label: "Eingang / Hof" },
        { value: "garage", label: "Garage" },
        { value: "treppenhaus", label: "Treppenhaus" },
        { value: "sonstiges", label: "Sonstiges" },
      ],
      showWhen: (a) => problemIs(a, "graffiti"),
    },
    {
      id: "melde_seit_wann",
      frage: "Seit wann?",
      optionen: [
        { value: "heute", label: "Heute entdeckt" },
        { value: "einige_tage", label: "Seit einigen Tagen" },
        { value: "mehrere_wochen", label: "Seit mehreren Wochen" },
        { value: "schon_laenger", label: "Schon länger" },
      ],
    },
    {
      id: "melde_groesse",
      frage: "Ungefähr wie groß?",
      optionen: [
        { value: "klein", label: "Klein (etwa handgroß / bis ~1 m²)" },
        { value: "mittel", label: "Mittel" },
        { value: "gross", label: "Groß (größere Fläche)" },
      ],
      showWhen: (a) =>
        problemIs(
          a,
          "schimmel_feucht",
          "fassade",
          "graffiti",
          "wand_ecke",
          "bad",
          "grossflaechig"
        ),
    },
  ],

  baum_notfall: [
    {
      id: "melde_problem",
      frage: "Was ist das Problem?",
      optionen: [
        {
          value: "ast_baum",
          label: "Ast oder Baum hängt runter oder blockiert den Weg",
        },
        {
          value: "hecke",
          label: "Hecke oder Sträucher versperren den Weg",
        },
        {
          value: "platten",
          label: "Gehwegplatten sind locker oder kaputt",
        },
        {
          value: "laub",
          label: "Weg ist voller Laub oder Schmutz",
        },
        { value: "sonstiges", label: "Sonstiges" },
        // Legacy
        { value: "astbruch", label: "Astbruch / herunterhängende Äste" },
        { value: "weg", label: "Weg / Durchgang eingeschränkt" },
      ],
    },
    {
      id: "melde_ort",
      frage: "Wo ist das?",
      optionen: [
        { value: "gehweg", label: "Gehweg" },
        { value: "hof", label: "Hof" },
        { value: "garten", label: "Garten" },
        { value: "parkplatz", label: "Parkplatz" },
        { value: "zufahrt", label: "Zufahrt" },
        { value: "spielplatz", label: "Spielplatz" },
        { value: "sonstiges", label: "Sonstiges" },
      ],
      showWhen: (a) => problemIs(a, "ast_baum", "astbruch", "weg", "sonstiges"),
    },
    {
      id: "melde_ort_hecke",
      frage: "Wo ist das?",
      optionen: [
        { value: "gehweg", label: "Gehweg" },
        { value: "zufahrt", label: "Zufahrt" },
        { value: "parkplatz", label: "Parkplatz" },
        { value: "hof", label: "Hof" },
        { value: "sonstiges", label: "Sonstiges" },
      ],
      showWhen: (a) => problemIs(a, "hecke"),
    },
    {
      id: "melde_ort_platten",
      frage: "Wo ist das?",
      optionen: [
        { value: "gehweg", label: "Gehweg" },
        { value: "hof", label: "Hof" },
        { value: "zufahrt", label: "Zufahrt" },
        { value: "spielplatz", label: "Spielplatz" },
        { value: "sonstiges", label: "Sonstiges" },
      ],
      showWhen: (a) => problemIs(a, "platten"),
    },
    {
      id: "melde_ort_laub",
      frage: "Wo ist das?",
      optionen: [
        { value: "gehweg", label: "Gehweg" },
        { value: "hof", label: "Hof" },
        { value: "zufahrt", label: "Zufahrt" },
        { value: "parkplatz", label: "Parkplatz" },
        { value: "sonstiges", label: "Sonstiges" },
      ],
      showWhen: (a) => problemIs(a, "laub"),
    },
    {
      id: "melde_seit_wann",
      frage: "Seit wann?",
      optionen: [
        { value: "gerade_eben", label: "Gerade eben" },
        { value: "heute", label: "Heute" },
        { value: "mehrere_tage", label: "Seit mehreren Tagen" },
        { value: "schon_laenger", label: "Schon länger" },
      ],
      showWhen: (a) => !problemIs(a, "ast_baum", "astbruch", "weg"),
    },
    {
      id: "melde_seit_wann_akut",
      frage: "Seit wann?",
      optionen: [
        { value: "gerade_eben", label: "Gerade eben" },
        { value: "heute", label: "Heute" },
        { value: "mehrere_tage", label: "Seit mehreren Tagen" },
      ],
      showWhen: (a) => problemIs(a, "ast_baum", "astbruch", "weg"),
    },
    {
      id: "melde_passierbar",
      frage: "Kann man noch vorbeigehen / vorbeifahren?",
      optionen: [
        { value: "ja", label: "Ja" },
        { value: "nein", label: "Nein" },
        { value: "schwer", label: "Nur schwer / ausweichen" },
      ],
      showWhen: (a) =>
        problemIs(
          a,
          "ast_baum",
          "hecke",
          "platten",
          "sonstiges",
          "astbruch",
          "weg"
        ),
    },
  ],

  sonstiges: [
    {
      id: "melde_problem",
      frage: "Was ist das Problem?",
      optionen: [
        {
          value: "muell",
          label: "Mülltonnen voll oder Müll liegt daneben / im Bereich",
        },
        {
          value: "treppenhaus_schmutz",
          label: "Treppenhaus oder Gemeinschaftsbereich ist schmutzig",
        },
        {
          value: "wespen",
          label: "Wespennest oder Insektennest (sichtbar)",
        },
        { value: "sonstiges", label: "Sonstiges" },
        // Legacy
        { value: "klingel", label: "Klingel / Gegensprechanlage" },
        { value: "gemeinschaft", label: "Gemeinschaftsfläche" },
        { value: "ungeziefer", label: "Ungeziefer" },
      ],
    },
    {
      id: "melde_ort",
      frage: "Wo ist das?",
      optionen: [
        { value: "muellraum", label: "Müllraum" },
        { value: "muellplatz", label: "Müllplatz" },
        { value: "aussen", label: "Außenanlage" },
        { value: "sonstiges", label: "Sonstiges" },
      ],
      showWhen: (a) => problemIs(a, "muell"),
    },
    {
      id: "melde_ort_treppe",
      frage: "Wo ist das?",
      optionen: [
        { value: "treppenhaus", label: "Treppenhaus" },
        { value: "eingang", label: "Eingangsbereich" },
        { value: "keller", label: "Keller" },
        { value: "sonstiges", label: "Sonstiges" },
      ],
      showWhen: (a) =>
        problemIs(a, "treppenhaus_schmutz", "gemeinschaft", "sonstiges", "klingel"),
    },
    {
      id: "melde_ort_wespen",
      frage: "Wo ist das?",
      optionen: [
        { value: "aussen", label: "Außenanlage" },
        { value: "eingang", label: "Eingangsbereich" },
        { value: "muellplatz", label: "Müllplatz" },
        { value: "keller", label: "Keller" },
        { value: "sonstiges", label: "Sonstiges" },
      ],
      showWhen: (a) => problemIs(a, "wespen", "ungeziefer"),
    },
    {
      id: "melde_seit_wann",
      frage: "Seit wann?",
      optionen: [
        { value: "heute", label: "Heute" },
        { value: "einige_tage", label: "Seit einigen Tagen" },
        { value: "eine_woche", label: "Seit einer Woche" },
        { value: "schon_laenger", label: "Schon länger" },
      ],
    },
    {
      id: "melde_staerke",
      frage: "Wie stark ist die Verschmutzung?",
      optionen: [
        { value: "leicht", label: "Leicht" },
        { value: "mittel", label: "Mittel" },
        { value: "stark", label: "Stark" },
      ],
      showWhen: (a) =>
        problemIs(a, "muell", "treppenhaus_schmutz", "gemeinschaft"),
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
