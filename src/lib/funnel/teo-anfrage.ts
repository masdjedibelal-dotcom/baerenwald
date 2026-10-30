/**
 * Servus TEO: Anfrage für alle, die Häuser verwalten (Hausverwaltung, WEG, Bestandshalter) — aus Sicht der Fälle, ohne Preisrahmen.
 * Die Auswahl wird intern auf Rechner-Bereiche gemappt, damit im CRM die Gewerke stimmen.
 */

import { MELDE_BEREICHE } from "@/lib/org/melde-bereiche";

export type TeoFall = "schaden" | "massnahme" | "betrieb" | "kennenlernen";
export type TeoAbsender = "hausverwaltung" | "weg" | "bestandshalter";

export const TEO_ABSENDER: { id: TeoAbsender; label: string; hint: string; feld: string }[] = [
  { id: "hausverwaltung", label: "Hausverwaltung", hint: "WEG- oder Mietverwaltung", feld: "Hausverwaltung" },
  { id: "weg", label: "Eigentümergemeinschaft", hint: "selbst verwaltet", feld: "Name der WEG" },
  { id: "bestandshalter", label: "Eigentümer oder Bestandshalter", hint: "Wohnungsunternehmen, Genossenschaft, eigene Häuser", feld: "Unternehmen" },
];

type Option = { id: string; label: string; hint?: string; bereiche: string[] };

export const TEO_FAELLE: { id: TeoFall; label: string; hint: string }[] = [
  { id: "schaden", label: "Schaden im Objekt", hint: "Rohrbruch, Heizung aus, Klingel defekt" },
  { id: "massnahme", label: "Angebot für eine Maßnahme", hint: "Dach, Fassade, Treppenhaus, auch für den Beschluss" },
  { id: "betrieb", label: "Laufender Betrieb", hint: "Hausmeister, Reinigung, Winterdienst, Wartungen" },
  { id: "kennenlernen", label: "teo für unsere Häuser", hint: "Kennenlernen und Ablauf besprechen" },
];

/** Einstieg von der Startseite („Was ist bei Ihnen gerade los?“): öffnet die Anfrage mit Vorauswahl. */
export type TeoSituation = {
  id: string;
  label: string;
  fall: TeoFall;
  schadenArten?: string[];
  leistungen?: string[];
};

export const TEO_SITUATIONEN: TeoSituation[] = [
  { id: "heizung", label: "Heizung fällt aus", fall: "schaden", schadenArten: ["heizung"] },
  { id: "wasser", label: "Wasser im Keller", fall: "schaden", schadenArten: ["wasser"] },
  { id: "strom", label: "Strom oder Klingel defekt", fall: "schaden", schadenArten: ["strom"] },
  { id: "angebote", label: "Wir brauchen ein Angebot für die Versammlung", fall: "massnahme" },
  { id: "pruefungen", label: "Prüffristen laufen ab", fall: "betrieb", leistungen: ["wartung"] },
  { id: "hausmeister", label: "Unser Hausmeister fällt weg", fall: "betrieb", leistungen: ["hausmeister"] },
  { id: "winter", label: "Winterdienst fehlt", fall: "betrieb", leistungen: ["winter"] },
  { id: "abgeben", label: "Wir wollen alle Häuser abgeben", fall: "kennenlernen" },
];

/** Gleiche Schadenbereiche wie Mieter-Meldung und Arbeitsplatz; hier auf Rechner-Bereiche gemappt (Gewerke im CRM). */
const SCHADEN_RECHNER_BEREICHE: Record<string, string[]> = {
  wasser: ["sanitaer"],
  heizung: ["heizung"],
  strom: ["elektrik"],
  fenster_tuer: ["fenster"],
  dach: ["dach"],
  schimmel: ["waende"],
  sonstiges: ["sonstiges"],
};

export const TEO_SCHADEN_ARTEN: Option[] = MELDE_BEREICHE.map((o) => ({
  id: o.id,
  label: o.label,
  hint: o.hint,
  bereiche: SCHADEN_RECHNER_BEREICHE[o.id] ?? ["sonstiges"],
}));

export const TEO_SCHADEN_ORT = [
  { id: "gemeinschaft", label: "Allgemeinflächen" },
  { id: "wohnung", label: "In einer Wohnung oder Einheit" },
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
  const z: string[] = [d.beschreibung.trim(), "", `Fall: ${fall}`, `Von: ${TEO_ABSENDER.find((a) => a.id === d.absender)?.label ?? "Hausverwaltung"}${d.firma.trim() ? ` · ${d.firma.trim()}` : ""}`];
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
