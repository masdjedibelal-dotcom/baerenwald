import type { RatgeberData } from "@/lib/ratgeber/types";

export const malerarbeitenKostenMuenchen: RatgeberData = {
  slug: "malerarbeiten-kosten-muenchen",
  titel: "Malerarbeiten Kosten München",
  metaTitle: "Malerarbeiten Kosten München 2025 — Preise pro m² & Faktoren",
  metaDescription:
    "Was kosten Malerarbeiten in München? Richtpreise 2024/25, Materialwahl, Ablauf, Zeit und lokale Besonderheiten — kompakt erklärt.",
  hero: {
    headline:
      "Was kostet es die Wohnung streichen zu lassen? München 2025",
    subline:
      "Alles was du wissen musst — echte Preise, wie lange es dauert und worauf du achten solltest.",
  },
  wannBrauche: {
    title: "Wann macht ein Profi Sinn?",
    punkte: [
      "Die Farbe ist vergilbt, abgeblättert oder fleckig",
      "Nach einem Wasserschaden oder Schimmelbefall",
      "Vor dem Einzug in eine neue Wohnung",
      "Beim Verkauf der Immobilie",
      "Nach anderen Renovierungsarbeiten im Zimmer",
      "Wenn die eigene Zeit oder Lust fehlt",
    ],
  },
  ablauf: [
    {
      schritt: "Vor-Ort-Termin — wir messen alles aus",
      text: "Wir messen die Wandflächen, beurteilen den Zustand und beraten zur Materialwahl.",
    },
    {
      schritt: "Angebot",
      text: "Du erhältst ein Festpreisangebot mit allen Positionen — kein böses Erwachen nachher.",
    },
    {
      schritt: "Vorbereitung",
      text: "Böden und Möbel werden abgedeckt, Löcher und Risse gespachtelt, Untergrund grundiert.",
    },
    {
      schritt: "Ausführung",
      text: "Anstrich in der vereinbarten Farbe — meist 2 Lagen für gleichmäßiges Ergebnis.",
    },
    {
      schritt: "Gemeinsame Kontrolle am Ende",
      text: "Wir gehen alles mit dir durch, offene Punkte werden sofort behoben.",
    },
    {
      schritt: "Fertigstellung",
      text: "Abdeckmaterial wird entfernt, Arbeitsbereich gereinigt, Altmaterial entsorgt.",
    },
  ],
  voraussetzungen: [
    "Wohnung muss zugänglich sein (Schlüssel oder Anwesenheit)",
    "Möbel idealerweise zur Raummitte geschoben",
    "Bei Mietwohnung: Genehmigung des Vermieters für Farbwechsel",
    "Schimmel muss vorher fachgerecht beseitigt sein (separate Vorarbeit)",
    "Neue Tapete braucht 24h Trocknungszeit vor dem Streichen",
  ],
  materialien: [
    {
      name: "Dispersionsfarbe",
      beschreibung:
        "Standard für Innenwände. Günstig, gut deckend, viele Farbtöne.",
      vonBis: "12–18 €/m²",
      fuer: "Wohn- und Schlafzimmer, Flur",
    },
    {
      name: "Silikatfarbe",
      beschreibung: "Diffusionsoffen, schimmelresistent, langlebig.",
      vonBis: "16–24 €/m²",
      fuer: "Feuchte Räume, Altbau",
    },
    {
      name: "Tapete (Vliestapete)",
      beschreibung:
        "Überdeckt Unebenheiten, viele Muster und Strukturen.",
      vonBis: "18–28 €/m²",
      fuer: "Wohnzimmer, Schlafzimmer",
    },
    {
      name: "Kalkfarbe",
      beschreibung:
        "Natürlich, atmungsaktiv, antibakteriell. Handwerklich anspruchsvoll.",
      vonBis: "20–32 €/m²",
      fuer: "Wer auf Naturmaterialien setzt",
    },
  ],
  kosten: {
    einheit: "pro m² Wandfläche inkl. Arbeit",
    von: 12,
    bis: 28,
    faktoren: [
      "Zustand der Wände (glatt vs. rissig)",
      "Materialwahl (Dispersionsfarbe vs. Kalk)",
      "Anzahl der Farbwechsel",
      "Zugänglichkeit (Gerüst nötig?)",
      "Deckenhöhe über 2,80m",
      "Menge (große Flächen günstiger pro m²)",
    ],
    beispiel:
      "3-Zimmer-Wohnung, 70 m² Wohnfläche, ca. 250 m² Wandfläche, Standard-Dispersionsfarbe, guter Zustand: 3.000 – 4.500 €",
  },
  zeitaufwand: {
    klein: "1–2 Tage",
    mittel: "3–5 Tage",
    gross: "1–2 Wochen",
    faktoren: [
      "Anzahl der Räume",
      "Trocknungszeit zwischen den Lagen",
      "Aufwendige Spachtelarbeiten",
      "Tapezieren statt Streichen (+50% Zeit)",
    ],
  },
  koordination:
    "Streichen kommt meist am Ende einer Renovierung. Wir legen die Reihenfolge fest — damit Elektrik, Boden und Maler nacheinander kommen und nichts doppelt gemacht werden muss.",
  koordinationUsps: [
    "Reihenfolge mit allen Beteiligten abstimmen",
    "Festpreis nach Vor-Ort-Termin",
    "Gemeinsame Kontrolle am Ende mit dir",
  ],
  faq: [
    {
      q: "Kann ich die Farbe selbst kaufen um Geld zu sparen?",
      a: "Grundsätzlich ja — aber Profi-Maler kaufen zu Einkaufskonditionen. Der Unterschied ist oft kleiner als gedacht. Wir beraten dich was sich lohnt.",
    },
    {
      q: "Wie viele Lagen Farbe brauche ich?",
      a: "Mindestens 2 Lagen für ein sauberes Ergebnis. Bei starkem Farbwechsel (z.B. dunkel auf hell) oft 3 Lagen.",
    },
    {
      q: "Muss ich bei der Arbeit anwesend sein?",
      a: "Nicht zwingend. Viele Kunden hinterlassen einen Schlüssel. Zum Abschluss empfehlen wir eine gemeinsame Kontrolle vor Ort.",
    },
    {
      q: "Was kostet nur die Decke streichen?",
      a: "Decken kosten ca. 8–15 €/m² wegen des Aufwands über Kopf. Bei gleichzeitiger Wandarbeit oft günstiger.",
    },
    {
      q: "Wie lange hält ein professioneller Anstrich?",
      a: "Bei hochwertiger Farbe und guter Ausführung 8–12 Jahre in Wohnräumen. In Feuchträumen kürzer.",
    },
    {
      q: "Was passiert mit dem Altmaterial?",
      a: "Wir entsorgen alles fachgerecht — Altfarbe, Tapetenreste, Verpackungen. Das ist im Preis enthalten.",
    },
  ],
  qualitaet: [
    "Gleichmäßiger Farbauftrag ohne Streifen, Nasen oder Pinselspuren",
    "Saubere Kanten an Deckenübergängen, Fenstern und Türrahmen",
    "Keine Blasen oder Abplatzungen nach dem Trocknen",
    "Vollständig abgedeckte Bereiche ohne Farbreste auf Böden oder Möbeln",
    "Gespachtelte Löcher und Risse sind nicht sichtbar",
  ],
  muenchen: [
    "🏛️ Viele Münchner Altbauten haben Stuckelemente — besonders sorgfältige Abklebung und Reinigung nötig",
    "📐 Typische Deckenhöhen von 3–3,5 m in Gründerzeithäusern: Gerüst oder Hebebühne kann den Preis erhöhen",
    "🏘️ In Schwabing & Maxvorstadt sind oft historische Wandbeläge zu erhalten — Spezialtechniken und Genehmigungen prüfen",
  ],
  leistungsSlug: "malerarbeiten",
  leistungsLabel: "Malerarbeiten in München",
  rechnerSituation: "erneuern",
  datePublished: "2024-06-01",
  dateModified: "2025-01-15",
};
