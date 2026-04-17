/**
 * Daten für den dynamischen Schritt „Fachdetails“ (Elektro / Sanitär / Heizung).
 * UI-Logik in {@link FachdetailsStep}.
 */

import type { Situation } from "@/lib/funnel/types";

export type FachdetailOptionDef = {
  value: string;
  label: string;
  hint?: string;
  emoji?: string;
  /** Kurzer Hinweis neben der Option (aufklappbar) */
  education?: string;
  followUpId?: string | null;
  /** z. B. Warnung bei Auswahl (Notfall) */
  warnText?: string;
};

export type FachdetailQuestionDef = {
  id: string;
  title: string;
  education?: string;
  inputType: "single" | "multi";
  options: FachdetailOptionDef[];
};

/** Elektro bei Situation „erneuern“ — Modernisierung / Ausbau */
export const ELEKTRO_ERNEUERN_Q1: FachdetailQuestionDef = {
  id: "elektro_erneuern",
  title: "Was soll erneuert werden?",
  inputType: "single",
  options: [
    {
      value: "sicherungskasten",
      label: "Sicherungskasten modernisieren",
      hint: "Komplette Erneuerung auf aktuellen FI-Standard — Pflicht bei älteren Anlagen",
    },
    {
      value: "leitungen",
      label: "Neue Leitungen / Steckdosen",
      hint: "Erweiterung oder Erneuerung der Elektrik",
      followUpId: "elektro_folge_leitungen",
    },
    {
      value: "echeck",
      label: "E-Check / Sicherheitsprüfung",
      hint: "Prüfung der gesamten Anlage — wichtig bei Mieterwechsel",
    },
    {
      value: "weiss_nicht",
      label: "Weiß ich nicht",
      hint: "Wir schauen es uns beim Termin an",
    },
  ],
};

/** Elektro bei Situation „kaputt“ — Störungen / Defekte */
export const ELEKTRO_KAPUTT_Q1: FachdetailQuestionDef = {
  id: "elektro_kaputt",
  title: "Was ist das Problem?",
  education:
    "Ein FI-Schalter, der auslöst, kann auf einen Erdschluss hinweisen — das sollte schnell geprüft werden.",
  inputType: "single",
  options: [
    {
      value: "sicherung",
      label: "Sicherung fliegt raus",
      hint: "FI oder LS-Schalter löst aus",
      followUpId: "elektro_folge_sicherung",
    },
    {
      value: "strom_weg",
      label: "Strom weg in einem Raum",
      hint: "Ein Bereich hat keinen Strom",
    },
    {
      value: "steckdose",
      label: "Steckdose / Schalter defekt",
      hint: "Einzelne Punkte funktionieren nicht",
      followUpId: "elektro_folge_steckdose",
    },
    {
      value: "fehlersuche",
      label: "Fehlersuche",
      hint: "Problem unbekannt — wir finden es",
    },
    {
      value: "weiss_nicht",
      label: "Weiß ich nicht",
      hint: "Wir klären das beim Termin",
    },
  ],
};

/** Frageblock Elektro je Situation (Notfall nutzt FACHDETAILS_NOTFALL im Step). */
export function getElektroQ1ForSituation(
  situation: Situation | null
): FachdetailQuestionDef {
  if (situation === "kaputt") return ELEKTRO_KAPUTT_Q1;
  return ELEKTRO_ERNEUERN_Q1;
}

export const ELEKTRO_FOLLOWUPS: Record<string, FachdetailQuestionDef> = {
  elektro_folge_sicherung: {
    id: "elektro_folge_sicherung",
    title: "Welche Sicherung?",
    inputType: "single",
    options: [
      {
        value: "fi",
        label: "FI-Schalter (großer Schalter)",
        hint: "Fehlerstrom-Schutz — typisch breiter Schalter",
      },
      {
        value: "ls",
        label: "LS-Schalter (kleiner Schalter)",
        hint: "Leitungsschutz — ein schmaler Schalter pro Kreis",
      },
      { value: "weiss_nicht", label: "Weiß ich nicht", hint: "" },
    ],
  },
  elektro_folge_steckdose: {
    id: "elektro_folge_steckdose",
    title: "Wie viele Punkte?",
    inputType: "single",
    options: [
      {
        value: "einzeln",
        label: "1–2 Punkte",
        hint: "Einzelne Steckdose / Schalter",
      },
      {
        value: "mehrere",
        label: "3–5 Punkte",
        hint: "Mehrere in einem Bereich",
      },
      {
        value: "viele",
        label: "Mehr als 5",
        hint: "Größerer Bereich betroffen",
      },
    ],
  },
  elektro_folge_leitungen: {
    id: "elektro_folge_leitungen",
    title: "Wie sollen die Leitungen verlegt werden?",
    education:
      "Unterputz: Kabel in der Wand — oft stemmen und wieder verputzen. Aufputz: Leitungen in Kästen/Kanälen sichtbar — schneller, weniger Staub.",
    inputType: "single",
    options: [
      {
        value: "unterputz",
        label: "Unterputz",
        hint: "Verlegung in der Wand — optisch am saubersten",
      },
      {
        value: "aufputz",
        label: "Aufputz",
        hint: "Auf der Wand / in Kanal — weniger Eingriff in den Putz",
      },
      { value: "weiss_nicht", label: "Weiß ich nicht genau", hint: "" },
    ],
  },
};

export const SANITAER_Q1: FachdetailQuestionDef = {
  id: "sanitaer_lage",
  title: "Wo sitzt das Problem?",
  education:
    "Lecks hinter der Wand bedeuten oft Stemmarbeiten — das erhöht den Aufwand und den Preis deutlich.",
  inputType: "single",
  options: [
    {
      value: "sichtbar",
      label: "Sichtbar zugänglich",
      hint: "Unter Waschbecken, Spüle oder Dusche",
    },
    {
      value: "wand",
      label: "Hinter der Wand",
      hint: "Unterputz-Leitung oder -Anschluss",
      followUpId: "sanitaer_folge_rohre",
    },
    {
      value: "keller",
      label: "Am Haupthahn / im Keller",
      hint: "Hauptabsperrung oder Zuleitung",
    },
    {
      value: "weiss_nicht",
      label: "Weiß ich nicht genau",
      hint: "Kein Problem — wir schauen uns das an",
    },
  ],
};

export const SANITAER_FOLLOWUPS: Record<string, FachdetailQuestionDef> = {
  sanitaer_folge_rohre: {
    id: "sanitaer_folge_rohre",
    title: "Was für Rohre sind verbaut?",
    inputType: "single",
    options: [
      {
        value: "kupfer",
        label: "Kupferrohre",
        hint: "Rötlich, ältere Häuser",
      },
      {
        value: "kunststoff",
        label: "Kunststoffrohre",
        hint: "Weiß oder grau, neuere Häuser",
      },
      { value: "weiss_nicht", label: "Weiß ich nicht genau", hint: "" },
    ],
  },
};

export const SANITAER_BAD_Q: FachdetailQuestionDef = {
  id: "sanitaer_bad_was",
  title: "Was soll gemacht werden?",
  education:
    "Ein komplettes Bad braucht Fliesen, Sanitär und Elektro — wir koordinieren alle drei Gewerke für dich.",
  inputType: "single",
  options: [
    {
      value: "reparatur",
      label: "Einzelne Reparatur",
      hint: "Kleines Problem beheben",
    },
    {
      value: "fliesen",
      label: "Nur Fliesen erneuern",
      hint: "Alte Fliesen raus, neue rein — ohne Rohre oder Sanitärobjekte zu ändern",
    },
    {
      value: "objekte",
      label: "Sanitärobjekte tauschen",
      hint: "WC, Dusche, Wanne, Waschbecken",
      followUpId: "sanitaer_bad_objekte_multi",
    },
    {
      value: "wanne_dusche",
      label: "Wanne zu Dusche",
      hint: "Umbau zur ebenerdigen oder bodengleichen Dusche",
    },
    {
      value: "komplett",
      label: "Komplett neu",
      hint: "Fliesen + Objekte + Elektro",
    },
    {
      value: "weiss_nicht",
      label: "Weiß ich nicht genau",
      hint: "",
    },
  ],
};

export const SANITAER_BAD_OBJEKTE_MULTI: FachdetailQuestionDef = {
  id: "sanitaer_bad_objekte_multi",
  title: "Was genau wird getauscht?",
  inputType: "multi",
  options: [
    { value: "wc", label: "WC", hint: "" },
    { value: "dusche", label: "Dusche / Wanne", hint: "" },
    { value: "waschbecken", label: "Waschbecken", hint: "" },
    {
      value: "armatur",
      label: "Wasserhähne / Armaturen",
      hint: "Waschtisch, Küche, Badewanne …",
    },
  ],
};

export const HEIZUNG_Q1: FachdetailQuestionDef = {
  id: "heizung_typ",
  title: "Was für eine Heizung hast du?",
  education:
    "Wärmepumpen und ältere Ölheizungen brauchen Spezialisten — das beeinflusst den Preis und die Verfügbarkeit unserer Handwerker.",
  inputType: "single",
  options: [
    {
      value: "gas",
      label: "Gas-Therme",
      hint: "Gasheizung mit Therme",
    },
    {
      value: "oel",
      label: "Ölheizung",
      hint: "Öltank im Keller",
      followUpId: "heizung_folge_oel_alter",
    },
    {
      value: "waermepumpe",
      label: "Wärmepumpe",
      hint: "Luft- oder Erdwärmepumpe",
      followUpId: "heizung_folge_wp_vorhaben",
    },
    {
      value: "fernwaerme",
      label: "Fernwärme",
      hint: "Hausanschluss ans Fernwärmenetz",
      education:
        "Störungen und Wartung klären wir mit deinem örtlichen Fernwärmeversorger oder einem zertifizierten Betrieb — wir helfen bei der Abstimmung.",
    },
    {
      value: "wartung",
      label: "Wartung / Inspektion",
      hint: "Reinigung, Brennerprüfung, Abgasmessung — Gas, Öl oder Wärmepumpe",
    },
    {
      value: "heizkoerper",
      label: "Heizkörper tauschen",
      hint: "Einzelne oder alle Heizkörper erneuern — inkl. Ventil und Thermostat",
    },
    {
      value: "weiss_nicht",
      label: "Weiß ich nicht genau",
      hint: "Kein Problem — wir schauen uns das an",
    },
  ],
};

export const HEIZUNG_FOLLOWUPS: Record<string, FachdetailQuestionDef> = {
  heizung_folge_oel_alter: {
    id: "heizung_folge_oel_alter",
    title: "Wie alt ist die Ölheizung?",
    education:
      "Heizungen über 20 Jahre müssen laut GEG eventuell ausgetauscht werden — wir beraten dich dazu.",
    inputType: "single",
    options: [
      {
        value: "unter20",
        label: "Unter 20 Jahre",
        hint: "Noch relativ neu",
      },
      {
        value: "ueber20",
        label: "Über 20 Jahre",
        hint: "Älteres System",
      },
      { value: "weiss_nicht", label: "Weiß ich nicht genau", hint: "" },
    ],
  },
  heizung_folge_wp_vorhaben: {
    id: "heizung_folge_wp_vorhaben",
    title: "Was soll gemacht werden?",
    education:
      "Wärmepumpen-Einbau ist ein größeres Projekt — wir planen das persönlich mit dir.",
    inputType: "single",
    options: [
      {
        value: "wartung",
        label: "Wartung / Service",
        hint: "Jährliche Kontrolle",
      },
      {
        value: "reparatur",
        label: "Reparatur",
        hint: "Etwas funktioniert nicht",
      },
      {
        value: "neu",
        label: "Neue Wärmepumpe einbauen",
        hint: "Erstinstallation",
      },
    ],
  },
};

/** Heizung bei Situation „kaputt“ */
export const HEIZUNG_KAPUTT_Q1: FachdetailQuestionDef = {
  id: "heizung_kaputt_problem",
  title: "Was ist das Problem?",
  inputType: "single",
  options: [
    {
      value: "geht_nicht",
      label: "Geht nicht an",
      hint: "Heizung startet nicht",
    },
    {
      value: "kein_warmwasser",
      label: "Kein warmes Wasser",
      hint: "Warmwasser fehlt oder kalt",
    },
    {
      value: "geraeusch",
      label: "Geräusche",
      hint: "Klopfen, Rauschen, Pfeifen",
    },
    {
      value: "fehlermeldung",
      label: "Fehlermeldung",
      hint: "Display oder Störungscode",
    },
    {
      value: "weiss_nicht",
      label: "Weiß ich nicht",
      hint: "Wir schauen es uns an",
    },
  ],
};

export const MALER_Q1: FachdetailQuestionDef = {
  id: "maler_was",
  title: "Was soll gestrichen werden?",
  education:
    "Decken streichen dauert oft länger als Wände — wegen Abdecken, Gerüst und längerer Trockenzeit.",
  inputType: "single",
  options: [
    {
      value: "waende",
      label: "Wände streichen oder tapezieren",
      hint: "Frischer Anstrich oder neue Tapete — inkl. Untergrundvorbereitung",
      followUpId: null,
    },
    {
      value: "tapezieren",
      label: "Tapezieren",
      hint: "Raufaser oder Vliestapeten — inkl. Untergrund vorbereiten",
      followUpId: null,
    },
    {
      value: "waende_decke",
      label: "Wände + Decke",
      hint: "Kompletter Raum",
      followUpId: "maler_folge_zustand",
    },
    {
      value: "komplett",
      label: "Alles komplett",
      hint: "Wände, Decke und Türen/Fenster im Raum",
      followUpId: "maler_folge_zustand",
    },
    {
      value: "fassade",
      label: "Fassade außen",
      hint: "Außenfarbe erneuern oder ausbessern",
      followUpId: "maler_folge_fassade",
    },
    {
      value: "weiss_nicht",
      label: "Weiß ich nicht genau",
      hint: "",
      followUpId: null,
    },
  ],
};

export const MALER_FOLLOWUPS: Record<string, FachdetailQuestionDef> = {
  maler_folge_zustand: {
    id: "maler_folge_zustand",
    title: "Wie ist der aktuelle Zustand der Wände?",
    inputType: "single",
    options: [
      {
        value: "glatt",
        label: "Glatt und sauber",
        hint: "Nur neue Farbe nötig",
      },
      {
        value: "risse",
        label: "Kleine Risse oder Flecken",
        hint: "Vorarbeiten nötig",
        education:
          "Risse müssen gespachtelt und geschliffen werden — das erhöht den Aufwand.",
      },
      {
        value: "stark",
        label: "Größere Ausbesserungen nötig",
        hint: "Löcher, starke Flecken, loser Putz",
      },
      {
        value: "weiss_nicht",
        label: "Weiß ich nicht genau",
        hint: "",
      },
    ],
  },
  maler_folge_fassade: {
    id: "maler_folge_fassade",
    title: "Was für eine Fassade ist es?",
    inputType: "single",
    options: [
      {
        value: "anstrich",
        label: "Fassade streichen",
        hint: "Frischer Anstrich außen",
      },
      {
        value: "klinker",
        label: "Klinker / Backstein",
        hint: "Reinigung und Imprägnierung",
        education:
          "Klinker bleibt sichtbar — wir reinigen, imprägnieren oder fassen Fugen gezielt an, statt „über alles zu streichen“.",
      },
      {
        value: "weiss_nicht",
        label: "Weiß ich nicht",
        hint: "Wir schauen es uns beim Termin an",
      },
    ],
  },
};

export const BODEN_Q1: FachdetailQuestionDef = {
  id: "boden_aktuell",
  title: "Was soll verlegt werden?",
  education:
    "Fliesenrückbau kann Staub und Lärm bedeuten — Dauer hängt von Fläche und Verlegung ab. Wir planen Staubschutz und Entsorgung mit ein.",
  inputType: "single",
  options: [
    {
      value: "balkon_belag",
      label: "Balkon / Terrasse",
      hint: "Fliesen, WPC-Dielen oder Beschichtung auf Balkon oder Terrasse",
      followUpId: null,
    },
    {
      value: "teppich",
      label: "Teppich",
      hint: "Teppichboden vorhanden",
      followUpId: null,
    },
    {
      value: "fliesen",
      label: "Fliesen",
      hint: "Keramik oder Steinzeug",
      followUpId: "boden_folge_fliesen",
    },
    {
      value: "laminat",
      label: "Laminat",
      hint: "Laminat oder Vinyl — schwimmend verlegt",
      followUpId: "boden_folge_laminat",
    },
    {
      value: "parkett",
      label: "Parkett",
      hint: "Echtholz — schwimmend oder verklebt",
      followUpId: "boden_folge_laminat",
    },
    {
      value: "parkett_schleifen",
      label: "Parkett abschleifen & versiegeln",
      hint: "Bestehenden Parkett aufbereiten — günstiger als neu verlegen",
    },
    {
      value: "estrich",
      label: "Rohboden / Estrich",
      hint: "Noch kein fertiger Bodenbelag",
      followUpId: null,
    },
    {
      value: "weiss_nicht",
      label: "Weiß ich nicht genau",
      hint: "",
      followUpId: null,
    },
  ],
};

export const BODEN_FOLLOWUPS: Record<string, FachdetailQuestionDef> = {
  boden_folge_fliesen: {
    id: "boden_folge_fliesen",
    title: "Wie sind die Fliesen verlegt?",
    inputType: "single",
    options: [
      {
        value: "normal",
        label: "Normal verklebt",
        hint: "Standard-Verlegung",
      },
      {
        value: "dick",
        label: "Dickbettmörtel",
        hint: "Ältere Verlegung, sehr fest",
        education:
          "Dickbett-Verlegung braucht beim Rückbau mehr Zeit und Werkzeug — wir planen das im Termin mit ein.",
      },
      {
        value: "weiss_nicht",
        label: "Weiß ich nicht genau",
        hint: "",
      },
    ],
  },
  boden_folge_laminat: {
    id: "boden_folge_laminat",
    title: "Ist es geklebt oder schwimmend?",
    inputType: "single",
    options: [
      {
        value: "schwimmend",
        label: "Schwimmend verlegt",
        hint: "Klickt oder liegt auf Dämmung — meist schneller Rückbau",
      },
      {
        value: "geklebt",
        label: "Geklebt",
        hint: "Vollflächig verklebt — Rückbau oft aufwendiger",
        education:
          "Geklebtes Parkett ist aufwendig zu entfernen — oft muss der Untergrund danach geschliffen werden.",
      },
      {
        value: "weiss_nicht",
        label: "Weiß ich nicht genau",
        hint: "",
      },
    ],
  },
};

export const DACH_Q1: FachdetailQuestionDef = {
  id: "dach_vorhaben",
  title: "Was ist das Problem oder Vorhaben?",
  education:
    "Einzelziegel oder Rinne: oft kurzer Einsatz. Dämmung oder Komplett-Eindeckung: mehrere Tage bis Wochen, abhängig von Wetter und Fläche.",
  inputType: "single",
  options: [
    {
      value: "ziegel_wenige",
      label: "Wenige Ziegel defekt",
      hint: "1–5 Ziegel — schnelle Reparatur",
      followUpId: null,
    },
    {
      value: "ziegel_bereich",
      label: "Größerer Bereich beschädigt",
      hint: "Mehrere Reihen — etwas mehr Aufwand",
      followUpId: null,
    },
    {
      value: "daemmung",
      label: "Dachdämmung erneuern",
      hint: "Wärmedämmung verbessern",
      followUpId: "dach_folge_alter",
    },
    {
      value: "komplett",
      label: "Komplett neu eindecken",
      hint: "Gesamtes Dach sanieren",
      followUpId: "dach_folge_alter",
    },
    {
      value: "dachfenster",
      label: "Dachfenster einbauen",
      hint: "Neues Fenster im Dach",
      followUpId: null,
    },
    {
      value: "regenrinne",
      label: "Regenrinne / Ablauf",
      hint: "Dachrinne, Fallrohr, Laubfang oder Anschluss",
      followUpId: null,
    },
    {
      value: "weiss_nicht",
      label: "Weiß ich nicht genau",
      hint: "",
      followUpId: null,
    },
  ],
};

export const DACH_FOLLOWUPS: Record<string, FachdetailQuestionDef> = {
  dach_folge_alter: {
    id: "dach_folge_alter",
    title: "Wie alt ist das Dach?",
    inputType: "single",
    options: [
      {
        value: "unter20",
        label: "Unter 20 Jahre",
        hint: "Noch relativ neu",
      },
      {
        value: "zwanzig_vierzig",
        label: "20–40 Jahre",
        hint: "Mittleres Alter",
      },
      {
        value: "ueber40",
        label: "Über 40 Jahre",
        hint: "Älteres Dach",
        education:
          "Ab ca. 40 Jahren sind Unterspannbahn, Latten und Dämmung oft mit zu planen — genauer Aufwand sieht man erst nach dem Aufdecken, deshalb kalkulieren wir einen Planungs-Puffer ein.",
      },
      {
        value: "weiss_nicht",
        label: "Weiß ich nicht genau",
        hint: "",
      },
    ],
  },
};

export const FENSTER_Q1: FachdetailQuestionDef = {
  id: "fenster_ausstattung",
  title: "Was für Fenster?",
  inputType: "single",
  options: [
    {
      value: "standard",
      label: "Standard",
      hint: "2-fach Verglasung — solider Standard",
    },
    {
      value: "premium",
      label: "Premium",
      hint: "3-fach Verglasung — bessere Dämmung und Schallschutz",
    },
  ],
};

/** Fenster/Tür bei Situation „kaputt“ */
export const FENSTER_DEFEKT_Q1: FachdetailQuestionDef = {
  id: "fenster_defekt_was",
  title: "Was ist defekt?",
  inputType: "single",
  options: [
    {
      value: "dichtung",
      label: "Dichtung undicht",
      hint: "Zugluft oder Wasser an der Dichtung",
    },
    {
      value: "schloss",
      label: "Schloss defekt",
      hint: "Schließt nicht oder klemmt",
    },
    {
      value: "rahmen",
      label: "Rahmen beschädigt",
      hint: "Holz, Kunststoff oder Metall",
    },
    {
      value: "glas",
      label: "Glas gebrochen",
      hint: "Einfach- oder Isolierverglasung",
    },
    {
      value: "weiss_nicht",
      label: "Weiß ich nicht",
      hint: "Wir prüfen vor Ort",
    },
  ],
};

export const GARTEN_Q1: FachdetailQuestionDef = {
  id: "garten_was",
  title: "Was soll gemacht werden?",
  education:
    "In München gilt oft: Fällung oder starke Rückschnitte an Bäumen ab ca. 3 m Stammhöhe (oder geschützte Arten) brauchen eine Genehmigung — wir prüfen das mit dir.",
  inputType: "single",
  options: [
    {
      value: "pflege",
      label: "Regelmäßig mähen und pflegen",
      hint: "Laufende Gartenpflege",
      followUpId: "garten_folge_haeufigkeit",
    },
    {
      value: "hecke",
      label: "Hecke schneiden",
      hint: "Einmalig oder regelmäßig",
      followUpId: null,
    },
    {
      value: "baum",
      label: "Bäume fällen oder beschneiden",
      hint: "Baumarbeiten",
      followUpId: "garten_folge_baum",
    },
    {
      value: "gestaltung",
      label: "Neu gestalten oder bepflanzen",
      hint: "Garten umgestalten",
      followUpId: "garten_folge_gestaltung",
    },
    {
      value: "weiss_nicht",
      label: "Weiß ich nicht genau",
      hint: "",
      followUpId: null,
    },
  ],
};

export const GARTEN_FOLLOWUPS: Record<string, FachdetailQuestionDef> = {
  garten_folge_haeufigkeit: {
    id: "garten_folge_haeufigkeit",
    title: "Wie oft soll gepflegt werden?",
    inputType: "single",
    options: [
      {
        value: "woechentlich",
        label: "Wöchentlich",
        hint: "Intensivpflege",
      },
      {
        value: "zweiwochentlich",
        label: "Alle 2 Wochen",
        hint: "Standard",
      },
      {
        value: "monatlich",
        label: "Monatlich",
        hint: "Grundpflege",
      },
      {
        value: "einmalig",
        label: "Einmalig",
        hint: "Ein Termin — z. B. Frühjahrsputz oder Urlaubsvertretung",
      },
    ],
  },
  garten_folge_baum: {
    id: "garten_folge_baum",
    title: "Wie groß sind die Bäume?",
    inputType: "single",
    options: [
      {
        value: "klein",
        label: "Unter 3 Meter",
        hint: "Kleine Bäume oder Sträucher",
      },
      {
        value: "mittel",
        label: "3–6 Meter",
        hint: "Mittelgroße Bäume",
      },
      {
        value: "gross",
        label: "Über 6 Meter",
        hint: "Große Bäume",
        education:
          "Große Bäume brauchen Spezialausrüstung und oft eine Genehmigung der Stadt München — Bearbeitungszeit 2–4 Wochen.",
      },
      {
        value: "weiss_nicht",
        label: "Weiß ich nicht genau",
        hint: "",
      },
    ],
  },
  garten_folge_gestaltung: {
    id: "garten_folge_gestaltung",
    title: "Was soll neu entstehen?",
    inputType: "multi",
    options: [
      { value: "rasen", label: "Neuer Rasen" },
      { value: "bepflanzung", label: "Bepflanzung / Beete" },
      { value: "wege", label: "Wege, Terrasse oder Pflaster" },
      { value: "zaun", label: "Zaun oder Sichtschutz" },
      {
        value: "bewaesserung",
        label: "Bewässerungsanlage",
        education:
          "Automatische Bewässerung braucht Wasseranschluss und Steuereinheit — planen wir separat.",
      },
    ],
  },
};
