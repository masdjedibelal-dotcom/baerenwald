/**
 * Allgemeine Anfrage (ohne Preisrahmen) — Auswahl aus Kundensicht, intern auf Rechner-Bereiche gemappt,
 * damit im CRM die Gewerke stimmen.
 */

export type AnfrageKundentyp = "privat" | "hausverwaltung" | "gewerbe";

export const ANFRAGE_KUNDENTYPEN: {
  id: AnfrageKundentyp;
  label: string;
  hint: string;
  /** leads.kundentyp */
  leadKundentyp: "eigentuemer" | "hausverwaltung" | null;
  /** kunden.typ bei Neuanlage */
  kundeTyp: "privat" | "hausverwaltung" | "gewerbe";
}[] = [
  { id: "privat", label: "Privat", hint: "Eigene Wohnung oder eigenes Haus", leadKundentyp: "eigentuemer", kundeTyp: "privat" },
  {
    id: "hausverwaltung",
    label: "Hausverwaltung / Eigentümergemeinschaft",
    hint: "Wohnanlagen, Instandhaltung, Objektbetreuung",
    leadKundentyp: "hausverwaltung",
    kundeTyp: "hausverwaltung",
  },
  { id: "gewerbe", label: "Gewerbe", hint: "Büro, Laden, Praxis, Hotel oder Gewerbeobjekt", leadKundentyp: null, kundeTyp: "gewerbe" },
];

export const ANFRAGE_ANLIEGEN: { id: string; label: string; bereiche: string[] }[] = [
  { id: "bad_kueche", label: "Bad oder Küche erneuern", bereiche: ["bad"] },
  { id: "sanieren", label: "Wohnung oder Haus sanieren", bereiche: ["trockenbau", "waende", "boden"] },
  { id: "huelle", label: "Dach, Fassade, Fenster", bereiche: ["dach", "fassade", "fenster"] },
  { id: "technik", label: "Heizung, Sanitär, Elektro", bereiche: ["heizung", "sanitaer", "elektrik"] },
  { id: "innen", label: "Boden, Wände, Malerarbeiten", bereiche: ["boden", "waende"] },
  { id: "garten", label: "Garten & Außenanlagen", bereiche: ["gartengestaltung"] },
  { id: "betreuung", label: "Laufende Betreuung (Hausmeister, Reinigung, Winterdienst)", bereiche: ["hausmeister", "reinigung", "winter"] },
  { id: "bauprojekt", label: "Größeres Bauprojekt / Neubau", bereiche: ["sonstiges"] },
  { id: "sonstiges", label: "Etwas anderes", bereiche: ["sonstiges"] },
];

export const ANFRAGE_OBJEKTARTEN = ["Wohnung", "Einfamilienhaus", "Mehrfamilienhaus", "Büro / Gewerbe", "Sonstiges"] as const;

export const ANFRAGE_ZEITRAUM = ["So bald wie möglich", "In 1–3 Monaten", "In 3–6 Monaten", "Später", "Noch offen"] as const;

export function anfrageBudgetOptionen(typ: AnfrageKundentyp | null): string[] {
  return typ === "privat"
    ? ["Bis 10.000 €", "10.000 – 30.000 €", "30.000 – 100.000 €", "Über 100.000 €", "Noch offen"]
    : ["Bis 50.000 €", "50.000 – 250.000 €", "250.000 € – 1 Mio. €", "Über 1 Mio. €", "Noch offen"];
}

export type AnfrageBau = {
  geschosse: string;
  einheiten: string;
  baujahr: string;
  lv: "" | "ja" | "in_arbeit" | "nein";
  architekt: "" | "vorhanden" | "benoetigt";
};

export type AnfrageDaten = {
  kundentyp: AnfrageKundentyp | "";
  anliegen: string[];
  plz: string;
  ort: string;
  strasse: string;
  objektart: string;
  flaeche: string;
  zeitraum: string;
  budget: string;
  beschreibung: string;
  bau: AnfrageBau;
  name: string;
  firma: string;
  email: string;
  telefon: string;
  datenschutz: boolean;
  /** Upload-Sitzung (`anfrage-…`) und hochgeladene Foto-URLs */
  sitzung: string;
  fotos: string[];
};

export function anfrageBereiche(anliegen: string[]): string[] {
  const out = new Set<string>();
  for (const a of anliegen) for (const b of ANFRAGE_ANLIEGEN.find((x) => x.id === a)?.bereiche ?? []) out.add(b);
  return [...out];
}

const LV_LABEL: Record<string, string> = { ja: "Ja", in_arbeit: "In Arbeit", nein: "Nein" };
const ARCHITEKT_LABEL: Record<string, string> = { vorhanden: "Vorhanden", benoetigt: "Wird benötigt" };

/** Lesbare Zusammenfassung für die Anfrage-Notiz im CRM. */
export function anfrageNachricht(d: AnfrageDaten): string {
  const typ = ANFRAGE_KUNDENTYPEN.find((k) => k.id === d.kundentyp)?.label;
  const anliegen = d.anliegen.map((a) => ANFRAGE_ANLIEGEN.find((x) => x.id === a)?.label).filter(Boolean);
  const zeilen = [
    d.beschreibung.trim(),
    "",
    typ ? `Kunde: ${typ}${d.firma.trim() && d.kundentyp !== "privat" ? ` · ${d.firma.trim()}` : ""}` : "",
    anliegen.length ? `Anliegen: ${anliegen.join(", ")}` : "",
    d.objektart ? `Objekt: ${d.objektart}` : "",
    d.flaeche.trim() ? `Fläche: ca. ${d.flaeche.trim()} m²` : "",
    d.zeitraum ? `Zeitraum: ${d.zeitraum}` : "",
    d.budget ? `Budget: ${d.budget}` : "",
  ];
  if (d.anliegen.includes("bauprojekt")) {
    const b = d.bau;
    zeilen.push(
      b.geschosse.trim() ? `Geschosse: ${b.geschosse.trim()}` : "",
      b.einheiten.trim() ? `Einheiten: ${b.einheiten.trim()}` : "",
      b.baujahr.trim() ? `Baujahr / Neubau: ${b.baujahr.trim()}` : "",
      b.lv ? `Leistungsverzeichnis: ${LV_LABEL[b.lv]}` : "",
      b.architekt ? `Architekt / Fachplaner: ${ARCHITEKT_LABEL[b.architekt]}` : ""
    );
  }
  return zeilen.filter((z, i) => z || i === 1).join("\n").trim();
}
