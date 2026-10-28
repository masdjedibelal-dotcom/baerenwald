/**
 * Servus TEO: Anfrage für Hausverwaltungen und WEGs — aus Sicht der Fälle, ohne Preisrahmen.
 * Die Auswahl wird intern auf Rechner-Bereiche gemappt, damit im CRM die Gewerke stimmen.
 */

export type TeoFall = "schaden" | "massnahme" | "betrieb" | "kennenlernen";
export type TeoAbsender = "hausverwaltung" | "weg";

type Option = { id: string; label: string; bereiche: string[] };

export const TEO_FAELLE: { id: TeoFall; label: string; hint: string }[] = [
  { id: "schaden", label: "Schaden im Objekt", hint: "Rohrbruch, Heizung aus, Klingel defekt" },
  { id: "massnahme", label: "Angebot für eine Maßnahme", hint: "Dach, Fassade, Treppenhaus, auch für den Beschluss" },
  { id: "betrieb", label: "Laufender Betrieb", hint: "Hausmeister, Reinigung, Winterdienst, Wartungen" },
  { id: "kennenlernen", label: "Unsere Objekte an teo übergeben", hint: "Kennenlernen und Ablauf besprechen" },
];

export const TEO_SCHADEN_ARTEN: Option[] = [
  { id: "wasser", label: "Wasser, Rohr, WC", bereiche: ["sanitaer"] },
  { id: "heizung", label: "Heizung, Warmwasser", bereiche: ["heizung"] },
  { id: "strom", label: "Strom, Licht, Klingel", bereiche: ["elektrik"] },
  { id: "dach", label: "Dach, Regenrinne", bereiche: ["dach"] },
  { id: "tuer", label: "Tür, Fenster, Schloss", bereiche: ["fenster"] },
  { id: "feuchte", label: "Feuchtigkeit, Schimmel", bereiche: ["waende"] },
  { id: "aussen", label: "Außenanlage, Baum, Weg", bereiche: ["gartengestaltung"] },
  { id: "sonstiges", label: "Etwas anderes", bereiche: ["sonstiges"] },
];

export const TEO_SCHADEN_ORT = [
  { id: "gemeinschaft", label: "Gemeinschaftseigentum" },
  { id: "wohnung", label: "In einer Wohnung" },
] as const;

export const TEO_DRINGLICHKEIT = [
  { id: "notfall", label: "Notfall, heute", zeitraum: "sofort" },
  { id: "woche", label: "In den nächsten Tagen", zeitraum: "diese_woche" },
  { id: "warten", label: "Kann warten", zeitraum: null },
] as const;

export const TEO_MASSNAHMEN: Option[] = [
  { id: "dach", label: "Dach", bereiche: ["dach"] },
  { id: "fassade", label: "Fassade", bereiche: ["fassade"] },
  { id: "fenster", label: "Fenster, Türen", bereiche: ["fenster"] },
  { id: "treppenhaus", label: "Treppenhaus, Malerarbeiten", bereiche: ["waende"] },
  { id: "heizung", label: "Heizung", bereiche: ["heizung"] },
  { id: "leitungen", label: "Leitungen, Strangsanierung", bereiche: ["sanitaer"] },
  { id: "elektro", label: "Elektro", bereiche: ["elektrik"] },
  { id: "balkone", label: "Balkone, Abdichtung", bereiche: ["fassade"] },
  { id: "aussen", label: "Außenanlagen", bereiche: ["gartengestaltung"] },
  { id: "sonstiges", label: "Etwas anderes", bereiche: ["sonstiges"] },
];

export const TEO_ANGEBOTE_ANZAHL = ["Ein Angebot", "Zwei Angebote", "Drei Angebote"] as const;

export const TEO_LEISTUNGEN: Option[] = [
  { id: "hausmeister", label: "Hausmeister", bereiche: ["hausmeister"] },
  { id: "reinigung", label: "Treppenhausreinigung", bereiche: ["reinigung"] },
  { id: "winter", label: "Winterdienst", bereiche: ["winter"] },
  { id: "garten", label: "Gartenpflege", bereiche: ["gartengestaltung"] },
  { id: "wartung", label: "Wartungen und Prüfungen", bereiche: ["sonstiges"] },
  { id: "muell", label: "Müllservice", bereiche: ["hausmeister"] },
];

export const TEO_START = ["So bald wie möglich", "Nächsten Monat", "Später", "Noch offen"] as const;

export type TeoAnfrageDaten = {
  fall: TeoFall | "";
  absender: TeoAbsender;
  /** Schaden */
  schadenArten: string[];
  schadenOrt: string;
  einheit: string;
  dringlichkeit: string;
  kontaktVorOrt: string;
  /** Maßnahme */
  massnahmen: string[];
  frist: string;
  angebote: string;
  /** Maßnahme + Betrieb */
  einheiten: string;
  baujahr: string;
  /** Betrieb */
  leistungen: string[];
  treppenhaeuser: string;
  start: string;
  /** Kennenlernen */
  objekteAnzahl: string;
  einheitenGesamt: string;
  /** Objekt */
  strasse: string;
  plz: string;
  ort: string;
  beschreibung: string;
  /** Kontakt */
  name: string;
  firma: string;
  email: string;
  telefon: string;
  datenschutz: boolean;
  sitzung: string;
  fotos: string[];
};

const label = (liste: Option[], ids: string[]) => ids.map((i) => liste.find((x) => x.id === i)?.label).filter(Boolean) as string[];

/** Gewerke fürs CRM aus der Auswahl. */
export function teoBereiche(d: Pick<TeoAnfrageDaten, "fall" | "schadenArten" | "massnahmen" | "leistungen">): string[] {
  const liste = d.fall === "schaden" ? TEO_SCHADEN_ARTEN : d.fall === "massnahme" ? TEO_MASSNAHMEN : d.fall === "betrieb" ? TEO_LEISTUNGEN : [];
  const ids = d.fall === "schaden" ? d.schadenArten : d.fall === "massnahme" ? d.massnahmen : d.fall === "betrieb" ? d.leistungen : [];
  const out = new Set<string>();
  for (const i of ids) for (const b of liste.find((x) => x.id === i)?.bereiche ?? []) out.add(b);
  return out.size ? [...out] : ["sonstiges"];
}

/** Lesbare Zusammenfassung für die Anfrage-Notiz im CRM. */
export function teoAnfrageNachricht(d: TeoAnfrageDaten): string {
  const fall = TEO_FAELLE.find((f) => f.id === d.fall)?.label ?? "";
  const z: string[] = [d.beschreibung.trim(), "", `Fall: ${fall}`, `Von: ${d.absender === "weg" ? "WEG (selbstverwaltet)" : "Hausverwaltung"}${d.firma.trim() ? ` · ${d.firma.trim()}` : ""}`];
  if (d.fall === "schaden") {
    z.push(
      `Was: ${label(TEO_SCHADEN_ARTEN, d.schadenArten).join(", ") || "—"}`,
      d.schadenOrt ? `Wo: ${TEO_SCHADEN_ORT.find((o) => o.id === d.schadenOrt)?.label}${d.einheit.trim() ? ` (${d.einheit.trim()})` : ""}` : "",
      d.dringlichkeit ? `Dringlichkeit: ${TEO_DRINGLICHKEIT.find((x) => x.id === d.dringlichkeit)?.label}` : "",
      d.kontaktVorOrt.trim() ? `Kontakt vor Ort: ${d.kontaktVorOrt.trim()}` : ""
    );
  }
  if (d.fall === "massnahme") {
    z.push(
      `Maßnahme: ${label(TEO_MASSNAHMEN, d.massnahmen).join(", ") || "—"}`,
      d.frist ? `Angebot benötigt bis: ${d.frist.split("-").reverse().join(".")}` : "",
      d.angebote ? `Gewünscht: ${d.angebote}` : "",
      d.einheiten.trim() ? `Einheiten: ${d.einheiten.trim()}` : "",
      d.baujahr.trim() ? `Baujahr: ${d.baujahr.trim()}` : ""
    );
  }
  if (d.fall === "betrieb") {
    z.push(
      `Leistungen: ${label(TEO_LEISTUNGEN, d.leistungen).join(", ") || "—"}`,
      d.einheiten.trim() ? `Einheiten: ${d.einheiten.trim()}` : "",
      d.treppenhaeuser.trim() ? `Treppenhäuser: ${d.treppenhaeuser.trim()}` : "",
      d.start ? `Start: ${d.start}` : ""
    );
  }
  if (d.fall === "kennenlernen") {
    z.push(
      d.objekteAnzahl.trim() ? `Objekte: ${d.objekteAnzahl.trim()}` : "",
      d.einheitenGesamt.trim() ? `Einheiten gesamt: ${d.einheitenGesamt.trim()}` : ""
    );
  }
  return z.filter((x, i) => x || i === 1).join("\n").trim();
}
