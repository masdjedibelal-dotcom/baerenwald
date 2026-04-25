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
  /** Sofort „zu komplex“ / persönliche Beratung (Rechner) */
  direktKomplex?: boolean;
  komplex_text?: string;
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
    ],
  },
};

/** Gemeinsame Optionen: Wasser / Sanitär (Reparatur & Erneuern mit Sanitär-Pfad). */
const SANITAER_WASSER_Q1_BODY = {
  title: "Was ist das Problem?",
  education:
    "Eine Auswahl reicht zuerst. Bei Leitungswasserschäden fragen wir danach nur, ob der Schaden sichtbar ist oder vermutlich verborgen — das Material der Rohre klärt der Handwerker vor Ort.",
  inputType: "single" as const,
  options: [
    {
      value: "leitung_leck",
      label: "Leitungswasserschaden / Rohr undicht",
      hint: "Tropft, feucht, Wasser austritt — nicht nur langsamer Abfluss",
      followUpId: "sanitaer_folge_leck_zugang",
    },
    {
      value: "verstopfung",
      label: "Verstopfung",
      hint: "WC, Waschbecken, Dusche, Küche — Wasser läuft schlecht ab oder steht",
    },
    {
      value: "keller",
      label: "Am Haupthahn / im Keller",
      hint: "Hauptabsperrung oder Zuleitung",
    },
    {
      value: "armatur",
      label: "Tropfende Armatur / sichtbarer Anschluss",
      hint: "Tropfen sichtbar am Objekt, kein vermuteter Rohrbruch hinter der Wand",
    },
  ],
};

export const SANITAER_Q1: FachdetailQuestionDef = {
  id: "sanitaer_lage",
  ...SANITAER_WASSER_Q1_BODY,
};

/** Kaputt ohne Bad: gleiche Inhalte wie {@link SANITAER_Q1}, eigene Screen-ID `sanitaer_problem`. */
export const SANITAER_KAPUTT_WASSER_Q1: FachdetailQuestionDef = {
  id: "sanitaer_problem",
  ...SANITAER_WASSER_Q1_BODY,
};

export const SANITAER_FOLLOWUPS: Record<string, FachdetailQuestionDef> = {
  /** Nur bei „Leitungswasserschaden / Rohr undicht“ — Zugänglichkeit für Diagnose/Einsatz (kein Rohrmaterial). */
  sanitaer_folge_leck_zugang: {
    id: "sanitaer_leck_zugang",
    title:
      "Ist der Schaden sichtbar (z.B. unter dem Waschbecken) oder vermutest du ihn hinter der Wand/im Boden?",
    education:
      "Damit der erste Rahmen zur Einschätzung passt — Details zum Bestand klärt der Meister vor Ort.",
    inputType: "single",
    options: [
      {
        value: "sichtbar",
        label: "Sichtbar zugänglich",
        hint: "z.B. unter dem Waschbecken, sichtbare Leitung oder Anschluss",
      },
      {
        value: "wand",
        label: "Hinter der Wand / im Boden vermutet",
        hint: "Eingriff in Putz, Fliese oder Estrich wahrscheinlicher",
      },
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
      value: "fliesen",
      label: "Nur Fliesen erneuern",
      hint: "Alte Fliesen raus, neue rein — ohne Rohre oder Sanitärobjekte zu ändern",
    },
    {
      value: "objekte",
      label: "Sanitärobjekte tauschen",
      hint: "Waschbecken, WC, Armaturen — Auswahl im nächsten Schritt",
      followUpId: "sanitaer_bad_objekt_liste",
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
  ],
};

/** Checkboxen für Teilsanierung Sanitär (badWas `objekte`; Legacy-Wert `sanitaer` = gleiche Logik) — Preislogik in price-calc. */
export const SANITAER_BAD_OBJEKT_LISTE: FachdetailQuestionDef = {
  id: "sanitaer_bad_objekt_liste",
  title: "Welche Bereiche sollen erneuert werden?",
  education: "Du kannst mehrere Optionen wählen — der Preisrahmen addiert sich aus den gewählten Positionen.",
  inputType: "multi",
  options: [
    {
      value: "waschbecken",
      label: "Waschbecken erneuern",
      hint: "",
    },
    {
      value: "wc",
      label: "WC-Anlage erneuern",
      hint: "",
    },
    {
      value: "armatur",
      label: "Armaturen (Dusche/Wanne) tauschen",
      hint: "",
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
  ],
};

/** „Erneuern“: ohne Wartung — die gibt es nur bei Kaputt/anderen Situationen. */
export const HEIZUNG_Q1_ERNEUERN: FachdetailQuestionDef = {
  ...HEIZUNG_Q1,
  title: "Was hast du aktuell?",
  options: HEIZUNG_Q1.options.filter((o) => o.value !== "wartung"),
};

/** Nach aktueller Anlage: gewünschter Ziel-Zustand (nur Erneuern). */
export const HEIZUNG_ZIEL: FachdetailQuestionDef = {
  id: "heizung_ziel",
  title: "Was ist dein Ziel?",
  education:
    "Damit der Preisrahmen und die Gewerke passen — du kannst die Auswahl später bei der Besichtigung noch präzisieren.",
  inputType: "single",
  options: [
    {
      value: "waermepumpe",
      label: "Wärmepumpe",
      hint: "Luft-, Sole- oder Erdwärmepumpe",
    },
    {
      value: "hybrid",
      label: "Hybrid-Lösung",
      hint: "z. B. Wärmepumpe mit Gas- oder Öl-Peaklast",
    },
    {
      value: "gas_brennwert",
      label: "Gas-Brennwert (Austausch)",
      hint: "Neue Gas-Therme / Brennwertgerät",
    },
    {
      value: "beratung",
      label: "Beratung erwünscht",
      hint: "Noch unsicher — wir stimmen das Vorhaben mit dir ab",
    },
  ],
};

/** Anzahl Heizkörper (Stückpreis × n). */
export const HEIZUNG_HEIZKOERPER_ANZAHL: FachdetailQuestionDef = {
  id: "heizung_heizkoerper_anzahl",
  title: "Wie viele Heizkörper sollen getauscht werden?",
  education:
    "Der Preisrahmen gilt pro Heizkörper inklusive typischem Zubehör — mehr Stückzahl, mehr Aufwand vor Ort.",
  inputType: "single",
  options: [
    { value: "1", label: "1", hint: "" },
    { value: "2", label: "2", hint: "" },
    { value: "3", label: "3", hint: "" },
    { value: "4", label: "4", hint: "" },
    { value: "5", label: "5", hint: "" },
    { value: "6", label: "6 und mehr", hint: "Ungefähre Angabe reicht" },
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

/** Heizung bei Situation „kaputt“ / Reparatur-Notfall */
export const HEIZUNG_KAPUTT_Q1: FachdetailQuestionDef = {
  id: "heizung_kaputt_problem",
  title: "Was trifft am ehesten zu?",
  education:
    "Eine Option reicht — du kannst Details später am Telefon oder vor Ort ergänzen.",
  inputType: "single",
  options: [
    {
      value: "heizung_kalt",
      label: "Heizung wird nicht warm (Heizkörper kalt)",
      hint: "Anlage läuft, aber Räume bleiben kühl",
    },
    {
      value: "kein_warmwasser",
      label: "Kein Warmwasser (Dusche bleibt kalt)",
      hint: "Warmwasser an Zapfstellen fehlt oder nur lauwarm",
    },
    {
      value: "druckverlust_wasser",
      label: "Heizung verliert Wasser / Druckverlust",
      hint: "Nachfüllen nötig, tropft sichtbar, Manometer fällt",
    },
    {
      value: "brenner_fehlermeldung",
      label: "Brennerstörung / Fehlermeldung am Display",
      hint: "Heizung springt ab, Störungscode oder Symbol",
    },
    {
      value: "geraeusche",
      label: "Seltsame Geräusche (Klopfen/Pfeifen)",
      hint: "Neue oder ungewohnte Geräusche von der Anlage oder Leitungen",
    },
  ],
};

/** Weiche im Gewerk „Fassade“ (nur Bereich „fassade“ — nicht mehr über Maler). */
export const FASSADE_ART_Q1: FachdetailQuestionDef = {
  id: "fassade_art",
  title: "Welche Arbeit ist bei der Fassade geplant?",
  education:
    "WDVS umfasst oft Gerüst, Dämmplatten und Oberflächen — Bekleidungen variieren stark nach Material — der Rahmen ist eine erste Orientierung.",
  inputType: "single",
  options: [
    {
      value: "anstrich",
      label: "Anstrich (Reinigung & Farbe)",
      hint: "Auffrischung der Optik, Oberfläche vorbereiten",
    },
    {
      value: "daemmung",
      label: "Dämmung (WDVS / energetisch)",
      hint: "Wärmedämmverbundsystem",
      education:
        "Dieser Richtpreis umfasst das gesamte Wärmedämmverbundsystem inklusive Gerüst und Endputz. Staatliche Förderungen können die Kosten signifikant senken.",
    },
    {
      value: "bekleidung",
      label: "Bekleidung (Holz / Schiefer / Paneele)",
      hint: "Neue oder erneuerte Fassadenhaut",
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
    ],
  },
};

export const BODEN_Q1: FachdetailQuestionDef = {
  id: "boden_material",
  title: "Was ist aktuell verlegt?",
  education:
    "Der bestehende Belag bestimmt Rückbau und Aufwand — z. B. Fliesen stemmen vs. Teppich entfernen. Wir planen Staubschutz und Entsorgung mit ein.",
  inputType: "single",
  options: [
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
      followUpId: "boden_folge_parkett",
    },
    {
      value: "estrich",
      label: "Rohboden / Estrich",
      hint: "Noch kein fertiger Bodenbelag",
      followUpId: null,
    },
  ],
};

export const BODEN_ZIEL_Q: FachdetailQuestionDef = {
  id: "boden_ziel",
  title: "Welchen Bodenbelag möchtest du verlegen lassen?",
  inputType: "single",
  options: [
    {
      value: "parkett",
      label: "Parkett",
      hint: "Echtholz mit hochwertiger Optik",
      followUpId: null,
    },
    {
      value: "laminat",
      label: "Laminat",
      hint: "Preisbewusst und robust",
      followUpId: null,
    },
    {
      value: "vinyl",
      label: "Vinyl",
      hint: "Pflegeleicht und wasserunempfindlich",
      followUpId: null,
    },
    {
      value: "fliesen",
      label: "Fliesen",
      hint: "Sehr langlebig und belastbar",
      followUpId: null,
    },
    {
      value: "teppich",
      label: "Teppich",
      hint: "Weich, warm und schalldämpfend",
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
    ],
  },
  boden_folge_parkett: {
    id: "boden_folge_parkett",
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
    ],
  },
};

export const DACH_Q1_ERNEUERN: FachdetailQuestionDef = {
  id: "dach_vorhaben",
  title: "Was soll am Dach erneuert werden?",
  education:
    "Projektarbeiten wie Eindeckung, Dämmung oder Dachfenster sind planbar und hängen stark von Fläche, Aufbau und Wetterfenster ab.",
  inputType: "single",
  options: [
    {
      value: "daemmung",
      label: "Dämmung verbessern",
      hint: "Energetische Verbesserung der Dachfläche",
      followUpId: "dach_folge_alter",
      education:
        "Ohne neue Eindeckung gerechnet — wenn zusätzlich Deckung/Dachhaut erneuert werden soll, das als eigene Auswahl „Komplett neu eindecken“ durchspielen oder beim Aufmaß kombinieren.",
    },
    {
      value: "komplett",
      label: "Komplett neu eindecken",
      hint: "Gesamtes Dach sanieren",
      followUpId: "dach_folge_alter",
      education:
        "Rahmen für neue Eindeckung inkl. üblicher Entsorgung — zusätzliche Aufdämmung ist eine zweite Position und kann beim Termin mit eingeplant werden.",
    },
    {
      value: "dachfenster",
      label: "Dachfenster-Austausch",
      hint: "Vorhandenes Dachfenster erneuern oder tauschen",
      followUpId: null,
    },
  ],
};

export const DACH_Q1_KAPUTT: FachdetailQuestionDef = {
  id: "dach_vorhaben",
  title: "Was ist akut am Dach beschädigt?",
  education:
    "Wähle den dringendsten Schaden — Details zur genauen Ursache klären wir beim Einsatz vor Ort.",
  inputType: "single",
  options: [
    {
      value: "ziegel_wenige",
      label: "Ziegel locker / heruntergefallen",
      hint: "Einzelne Ziegel lose, gerutscht oder bereits gefallen",
      followUpId: null,
    },
    {
      value: "undichtigkeit",
      label: "Undichtigkeit / Wasser dringt ein",
      hint: "Feuchte Stellen, Tropfen oder Wassereintritt",
      followUpId: null,
    },
    {
      value: "sturmschaden",
      label: "Sturmschaden",
      hint: "Schaden nach Wind/Sturm an Dachfläche oder Anbauteilen",
      followUpId: null,
    },
    {
      value: "regenrinne",
      label: "Dachrinne verstopft / defekt",
      hint: "Rinne, Fallrohr, Laubfang oder Anschluss",
      followUpId: null,
    },
  ],
};

/** Legacy-Default: Projektvariante (Erneuern). */
export const DACH_Q1: FachdetailQuestionDef = DACH_Q1_ERNEUERN;

export function getDachQ1ForSituation(
  situation: Situation | null
): FachdetailQuestionDef {
  if (situation === "kaputt") return DACH_Q1_KAPUTT;
  return DACH_Q1_ERNEUERN;
}

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
    ],
  },
};

export const FENSTER_Q1: FachdetailQuestionDef = {
  id: "fenster_ausstattung",
  title: "Was soll erneuert werden?",
  education:
    "Bei einer Mischung aus Fenstern und Türen oder mehreren Güteklassen: für den Online-Rahmen den Schwerpunkt oder den höherwertigen Typ wählen — beim Aufmaß klären wir Details und ein genaues Angebot.",
  inputType: "single",
  options: [
    {
      value: "standard",
      label: "Standard-Fenster",
      hint: "2-fach Verglasung — solider Standard",
    },
    {
      value: "premium",
      label: "Premium-Fenster",
      hint: "3-fach Verglasung — bessere Dämmung und Schallschutz",
    },
    {
      value: "tuer",
      label: "Haus- oder Nebeneingangstür",
      hint: "Außentür inkl. Zarge und fachgerechter Montage — realistischer Rahmen",
    },
    {
      value: "balkon_tuer",
      label: "Balkon- / Terrassentür",
      hint: "Wird preislich wie Premium-Fenster kalkuliert — genauer Aufmaß vor Ort",
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
        value: "zweimal_monat",
        label: "Alle 2 Wochen",
        hint: "Standard",
      },
      {
        value: "monatlich",
        label: "Monatlich",
        hint: "Grundpflege",
      },
      {
        value: "saisonal",
        label: "Saisonal",
        hint: "Frühjahr & Herbst",
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
    ],
  },
};
