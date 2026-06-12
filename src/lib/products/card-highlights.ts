import type {
  BadAusstattungStufe,
  HausserviceStufe,
  Produkt,
  ProduktFamilie,
  ProduktGroesse,
} from "./types";

/** Max. Bullets pro Karte — nur das, was diese Stufe/Größe auszeichnet. */
const MAX_BULLETS = 3;

/** Gemeinsame Basis — einmal unter dem Grid, nicht in jeder Karte wiederholen. */
export const BAD_PAKET_BASELINE =
  "Alle Pakete: Demontage, Sanitär, Fliesen, Elektro, Abdichtung & ein Ansprechpartner für alle Gewerke.";

const BAD_TIER_BULLETS: Record<BadAusstattungStufe, string[]> = {
  standard: [
    "Solide Ausstattung — alles Nötige",
    "Standard-Armaturen & Fliesen",
    "Festpreis nach Besichtigung",
  ],
  komfort: [
    "Bodengleiche Dusche",
    "Hochwertigere Armaturen",
    "Nischen & Ablagen in Fliesen",
  ],
  gehoben: [
    "Design-Armaturen & Premium-Fliesen",
    "Indirekte Beleuchtung & Design-Spiegel",
    "Barrierefrei auf Wunsch",
  ],
};

export const GARTEN_PAKET_BASELINE =
  "Jeder Besuch: Rasen, Hecken, Beete, Laub & Entsorgung — mit festem Team.";

const HAUSSERVICE_TIER_BULLETS: Record<HausserviceStufe, string[]> = {
  basis: [
    "Hausmeister-Betreuung vor Ort",
    "Technische Kleinigkeiten",
    "Monatlicher Kurzreport",
  ],
  komfort: [
    "Inkl. regelmäßige Reinigung",
    "Gartenarbeiten im Abo",
    "Alles aus Basis",
  ],
  premium: [
    "Winterdienst in der Saison",
    "Alles aus Komfort",
  ],
};

const GARTEN_SIZE_BULLETS: Record<ProduktGroesse, string[]> = {
  s: ["Kleiner Garten bis ca. 80 m²", "Kernpflege pro Besuch", "Entsorgung inklusive"],
  m: [
    "Mittlerer Garten bis ca. 200 m²",
    "Größere Hecken & Terrassen",
    "Empfohlen für die meisten Gärten",
  ],
  l: [
    "Großer Garten bis ca. 350 m²",
    "Hanglagen nach Absprache",
    "Saisonale Extras im Herbst",
  ],
};

function shortenFixBullet(text: string): string {
  return text
    .replace(/ & /g, " und ")
    .replace(/Vor-Ort-/i, "")
    .replace(/Dokumentation.*/i, "Dokumentation")
    .trim();
}

export type CardDisplay = {
  bullets: string[];
  baseline?: string;
};

/** Nur Differenziatoren auf der Karte — Details im Angebot. */
export function getCardDisplay(
  produkt: Produkt,
  familie: ProduktFamilie
): CardDisplay {
  if (familie === "bad" && produkt.stufe) {
    return {
      bullets: BAD_TIER_BULLETS[produkt.stufe as BadAusstattungStufe].slice(
        0,
        MAX_BULLETS
      ),
      baseline: BAD_PAKET_BASELINE,
    };
  }

  if (familie === "hausservice" && produkt.stufe) {
    return {
      bullets: HAUSSERVICE_TIER_BULLETS[produkt.stufe as HausserviceStufe].slice(
        0,
        MAX_BULLETS
      ),
    };
  }

  if (familie === "garten" && produkt.groesse) {
    return {
      bullets: GARTEN_SIZE_BULLETS[produkt.groesse].slice(0, MAX_BULLETS),
      baseline: GARTEN_PAKET_BASELINE,
    };
  }

  if (familie === "fix") {
    const bullets = produkt.leistungen
      .slice(0, MAX_BULLETS)
      .map(shortenFixBullet);
    return { bullets };
  }

  return {
    bullets: produkt.leistungen.slice(0, MAX_BULLETS),
  };
}
