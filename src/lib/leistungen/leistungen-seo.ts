/** Kurzantwort, Kosten-H2 und FAQ-H2 je Leistungs-Basis-Slug. */
export type LeistungSeoBlock = {
  kurzeAntwort: string;
  kostenH2: string;
  faqH2: string;
};

const BAD_SANIERUNG: LeistungSeoBlock = {
  kurzeAntwort:
    "Eine Badsanierung kostet in München 6.500–22.000 Euro komplett. Bärenwald koordiniert Sanitär, Fliesen und Elektro — ein Ansprechpartner, ein Festpreis.",
  kostenH2: "Was kostet eine Badsanierung in München 2026?",
  faqH2: "Häufige Fragen zur Badsanierung in München",
};

const MALER: LeistungSeoBlock = {
  kurzeAntwort:
    "Malerarbeiten kosten in München 12–28 Euro pro m² Wandfläche inklusive Arbeit. Bärenwald koordiniert Maler mit allen anderen Gewerken aus einer Hand.",
  kostenH2: "Was kosten Malerarbeiten in München 2026?",
  faqH2: "Häufige Fragen zu Malerarbeiten in München",
};

const BODEN: LeistungSeoBlock = {
  kurzeAntwort:
    "Neuer Boden kostet in München 35–200 Euro pro m² inkl. Verlegung — je nach Material. Laminat ab 35 €/m², Parkett ab 80 €/m², Fliesen ab 45 €/m².",
  kostenH2: "Was kostet neuer Boden in München 2026?",
  faqH2: "Häufige Fragen zum Bodenbelag in München",
};

const HEIZUNG: LeistungSeoBlock = {
  kurzeAntwort:
    "Heizungsreparatur oder -tausch in München: Notdienst meist innerhalb von 24 Stunden. Kosten je nach Aufwand 300–2.500 Euro für Reparatur, Neuanlage 8.000–35.000 Euro.",
  kostenH2:
    "Was kostet Heizungsreparatur oder Heizungstausch in München 2026?",
  faqH2: "Häufige Fragen zu Heizung und Sanitär in München",
};

const ELEKTRO: LeistungSeoBlock = {
  kurzeAntwort:
    "Elektroarbeiten kosten in München 85–140 Euro pro Anschlusspunkt. Notdienst bei Stromausfall meist am gleichen Tag. Bärenwald koordiniert zertifizierte Elektro-Meisterbetriebe.",
  kostenH2: "Was kosten Elektroarbeiten in München 2026?",
  faqH2: "Häufige Fragen zu Elektroarbeiten in München",
};

export const LEISTUNG_SEO: Record<string, LeistungSeoBlock> = {
  "badezimmer-sanierung": BAD_SANIERUNG,
  "bad-sanieren": BAD_SANIERUNG,
  malerarbeiten: MALER,
  bodenbelag: BODEN,
  "boden-verlegen": BODEN,
  "heizung-defekt": HEIZUNG,
  "heizung-sanitaer": HEIZUNG,
  elektroarbeiten: ELEKTRO,
  stromausfall: ELEKTRO,
  hausmeisterservice: {
    kurzeAntwort:
      "Hausmeisterservice kostet in München 250–800 Euro pro Monat je nach Objektgröße und Leistungsumfang. Bärenwald stellt eigene Teams — kein Weiterverleih.",
    kostenH2: "Was kostet Hausmeisterservice in München 2026?",
    faqH2: "Häufige Fragen zum Hausmeisterservice in München",
  },
  gartengestaltung: {
    kurzeAntwort:
      "Gartengestaltung kostet in München je nach Projekt 2.000–30.000 Euro. Bärenwald plant und baut Gärten mit eigenem GaLaBau-Team — von Terrasse bis Naturpool.",
    kostenH2: "Was kostet Gartengestaltung in München 2026?",
    faqH2: "Häufige Fragen zur Gartengestaltung in München",
  },
  gartenpflege: {
    kurzeAntwort:
      "Gartenpflege kostet in München 180–350 Euro pro Monat im Abo. Bärenwald stellt eigene Teams für Rasenmähen, Heckenschnitt und Laubbeseitigung.",
    kostenH2: "Was kostet Gartenpflege in München 2026?",
    faqH2: "Häufige Fragen zur Gartenpflege in München",
  },
  winterdienst: {
    kurzeAntwort:
      "Winterdienst kostet in München 450–1.200 Euro pro Saison. In München sind Eigentümer streupflichtig — bei Nichterfüllung droht Haftung.",
    kostenH2: "Was kostet Winterdienst in München 2026?",
    faqH2: "Häufige Fragen zum Winterdienst in München",
  },
  dachbodenausbau: {
    kurzeAntwort:
      "Ein Dachbodenausbau kostet in München 1.200–2.500 Euro pro m² Nutzfläche inkl. Dämmung, Trockenbau und Elektro. Bärenwald koordiniert alle Gewerke.",
    kostenH2: "Was kostet ein Dachbodenausbau in München 2026?",
    faqH2: "Häufige Fragen zum Dachbodenausbau in München",
  },
  fassadendaemmung: {
    kurzeAntwort:
      "Fassadendämmung kostet in München 80–200 Euro pro m² je nach System (WDVS oder Vorhangfassade). KfW-Förderung möglich. Bärenwald koordiniert Planung und Umsetzung.",
    kostenH2: "Was kostet Fassadendämmung in München 2026?",
    faqH2: "Häufige Fragen zur Fassadendämmung in München",
  },
  rohrbruch: {
    kurzeAntwort:
      "Rohrbruch-Notdienst in München: Bärenwald koordiniert Sanitär-Meisterbetriebe meist innerhalb von 2–4 Stunden. Dokumentation für Versicherung inklusive.",
    kostenH2: "Was kostet ein Rohrbruch-Notdienst in München 2026?",
    faqH2: "Häufige Fragen zum Rohrbruch in München",
  },
  dachschaden: {
    kurzeAntwort:
      "Dachreparatur kostet in München ab 500 Euro für kleine Schäden. Bei Sturmschäden übernimmt die Wohngebäudeversicherung — Bärenwald dokumentiert für den Versicherungsfall.",
    kostenH2: "Was kostet eine Dachreparatur in München 2026?",
    faqH2: "Häufige Fragen zu Dachschäden in München",
  },
  dacharbeiten: {
    kurzeAntwort:
      "Dacharbeiten kosten in München ab 500 Euro für Reparaturen und 150–350 Euro pro m² für eine Komplettsanierung. Bärenwald koordiniert Dachdecker und Gerüstbau.",
    kostenH2: "Was kosten Dacharbeiten in München 2026?",
    faqH2: "Häufige Fragen zu Dacharbeiten in München",
  },
  baumarbeiten: {
    kurzeAntwort:
      "Baumarbeiten kosten in München 300–3.000 Euro je nach Baum und Aufwand. Bärenwald hat ein eigenes GaLaBau-Team für Fällungen, Rückschnitt und Gefahrenabwehr.",
    kostenH2: "Was kosten Baumarbeiten in München 2026?",
    faqH2: "Häufige Fragen zu Baumarbeiten in München",
  },
  kellerausbau: {
    kurzeAntwort:
      "Ein Kellerausbau kostet in München 800–2.000 Euro pro m² je nach Ausbaustufe. Bärenwald koordiniert Abdichtung, Trockenbau, Elektro und Böden aus einer Hand.",
    kostenH2: "Was kostet ein Kellerausbau in München 2026?",
    faqH2: "Häufige Fragen zum Kellerausbau in München",
  },
  wanddurchbruch: {
    kurzeAntwort:
      "Ein Wanddurchbruch kostet in München 1.500–6.000 Euro je nach Wandtyp (tragend oder nicht). Bärenwald koordiniert Statiker, Abbruch und anschließende Malerarbeiten.",
    kostenH2: "Was kostet ein Wanddurchbruch in München 2026?",
    faqH2: "Häufige Fragen zum Wanddurchbruch in München",
  },
  terrassenbau: {
    kurzeAntwort:
      "Ein Terrassenbau kostet in München 150–600 Euro pro m² je nach Material (Holz, Stein, WPC). Bärenwald baut mit eigenem GaLaBau-Team und koordiniert Elektro für Beleuchtung.",
    kostenH2: "Was kostet ein Terrassenbau in München 2026?",
    faqH2: "Häufige Fragen zum Terrassenbau in München",
  },
  "fenster-tueren": {
    kurzeAntwort:
      "Neue Fenster kosten in München 400–2.500 Euro pro Fenster inkl. Einbau. Türen ab 800 Euro. Lieferzeit 6–12 Wochen — frühzeitig planen.",
    kostenH2: "Was kostet Fenster- und Türarbeiten in München 2026?",
    faqH2: "Häufige Fragen zu Fenstern und Türen in München",
  },
  trockenbau: {
    kurzeAntwort:
      "Trockenbau kostet in München 60–160 Euro pro m². Eine neue Trennwand für ein 15 m² Zimmer kostet ca. 800–1.500 Euro. Bärenwald koordiniert Trockenbau und Elektro.",
    kostenH2: "Was kostet Trockenbau in München 2026?",
    faqH2: "Häufige Fragen zum Trockenbau in München",
  },
};

/** priceRange für Service JSON-LD je Basis-Slug. */
export const LEISTUNG_PRICE_RANGE: Record<string, string> = {
  "badezimmer-sanierung": "6.500–22.000 €",
  "bad-sanieren": "6.500–22.000 €",
  malerarbeiten: "12–28 € pro m²",
  bodenbelag: "35–200 € pro m²",
  "boden-verlegen": "35–200 € pro m²",
  "heizung-defekt": "300–35.000 €",
  "heizung-sanitaer": "300–35.000 €",
  elektroarbeiten: "85–140 € pro Punkt",
  stromausfall: "85–140 € pro Punkt",
  hausmeisterservice: "250–800 € pro Monat",
  gartengestaltung: "2.000–30.000 €",
  gartenpflege: "180–350 € pro Monat",
  winterdienst: "450–1.200 € pro Saison",
  dachbodenausbau: "1.200–2.500 € pro m²",
  fassadendaemmung: "80–200 € pro m²",
  rohrbruch: "300–3.000 €",
  dachschaden: "500–5.000 €",
  dacharbeiten: "500–5.000 €",
  baumarbeiten: "300–3.000 €",
  kellerausbau: "800–2.000 € pro m²",
  wanddurchbruch: "1.500–6.000 €",
  terrassenbau: "150–600 € pro m²",
  "fenster-tueren": "400–2.500 € pro Fenster",
  trockenbau: "60–160 € pro m²",
};

export function leistungPriceRangeForSlug(
  baseSlug: string | null
): string | undefined {
  if (!baseSlug) return undefined;
  return LEISTUNG_PRICE_RANGE[baseSlug];
}

export function leistungSeoForSlug(
  baseSlug: string | null,
  label: string
): LeistungSeoBlock {
  if (baseSlug && LEISTUNG_SEO[baseSlug]) {
    return LEISTUNG_SEO[baseSlug];
  }
  const name = label.trim() || "diese Leistung";
  return {
    kurzeAntwort: `${name} in München — Preisrahmen unverbindlich online berechnen. Bärenwald koordiniert Meisterbetriebe mit einem Ansprechpartner.`,
    kostenH2: `Was kostet ${name} in München 2026?`,
    faqH2: `Häufige Fragen zu ${name} in München`,
  };
}
