import type { Produkt } from "./types";

export const FIX_FAMILIE_LABEL = "Sanieren & Notfall";

export type FixGewerkId = "sanitaer" | "elektro" | "heizung";

export const FIX_GEWERKE: { id: FixGewerkId; label: string }[] = [
  { id: "sanitaer", label: "Sanitär" },
  { id: "elektro", label: "Elektro" },
  { id: "heizung", label: "Heizung" },
];

export const FIX_DEFAULT_GEWERK: FixGewerkId = "sanitaer";

export const FIX_PRODUKTE: Produkt[] = [
  {
    slug: "fix-verstopfung",
    titel: "Verstopfung beheben",
    kurz: "WC, Waschbecken, Dusche oder Abfluss",
    familie: "fix",
    leistungSlugs: ["heizung-sanitaer", "rohrbruch"],
    leistungen: [
      "Ursache finden",
      "Verstopfung beseitigen",
      "Spülung & Funktionsprüfung",
      "Entsorgung inklusive",
    ],
    scopeVersion: "1.2",
    situation: "kaputt",
    bereiche: ["sanitaer"],
  },
  {
    slug: "fix-armatur",
    titel: "Armatur tauschen",
    kurz: "Tropfende oder defekte Armatur am Waschbecken",
    familie: "fix",
    leistungSlugs: ["heizung-sanitaer", "rohrbruch"],
    leistungen: [
      "Diagnose & Beratung",
      "Demontage & Montage",
      "Dichtheitsprüfung",
      "Material auf Wunsch",
    ],
    scopeVersion: "1.2",
    situation: "kaputt",
    bereiche: ["sanitaer"],
  },
  {
    slug: "fix-rohrleck",
    titel: "Rohr undicht / Leck",
    kurz: "Wasserschaden, feuchte Wand oder sichtbarer Austritt",
    familie: "fix",
    leistungSlugs: ["heizung-sanitaer", "rohrbruch"],
    leistungen: [
      "Schaden begrenzen & absperren",
      "Leck lokalisieren",
      "Reparatur oder provisorische Abdichtung",
      "Empfehlung für Folgearbeiten",
    ],
    scopeVersion: "1.2",
    situation: "kaputt",
    bereiche: ["sanitaer"],
  },
  {
    slug: "fix-wc-spuelkasten",
    titel: "WC / Spülkasten",
    kurz: "Läuft nach, spült nicht oder Mechanik defekt",
    familie: "fix",
    leistungSlugs: ["heizung-sanitaer"],
    leistungen: [
      "Ursache am WC oder Spülkasten",
      "Einstellung oder Tausch der Mechanik",
      "Dichtheitsprüfung",
      "Entsorgung Alt-Teile",
    ],
    scopeVersion: "1.2",
    situation: "kaputt",
    bereiche: ["sanitaer"],
  },
  {
    slug: "fix-steckdose",
    titel: "Steckdose reparieren",
    kurz: "Defekte Steckdose oder Schalter",
    familie: "fix",
    leistungSlugs: ["elektroarbeiten", "stromausfall"],
    leistungen: [
      "Fehleranalyse vor Ort",
      "Steckdose oder Schalter tauschen",
      "Leitung & Kontakte prüfen",
      "Sicherheitsprüfung nach VDE",
    ],
    scopeVersion: "1.2",
    situation: "kaputt",
    bereiche: ["elektro"],
  },
  {
    slug: "fix-fi",
    titel: "FI-Schalter / Sicherung",
    kurz: "Sicherung fliegt oder FI löst aus",
    familie: "fix",
    leistungSlugs: ["elektroarbeiten", "stromausfall"],
    leistungen: [
      "Fehlersuche am Sicherungskasten",
      "FI-Schalter oder Sicherung tauschen",
      "Isolations- & Funktionsprüfung",
      "Empfehlung bei alter Anlage",
    ],
    scopeVersion: "1.2",
    situation: "kaputt",
    bereiche: ["elektro"],
  },
  {
    slug: "fix-stromausfall",
    titel: "Stromausfall im Raum",
    kurz: "Ein Bereich hat plötzlich keinen Strom",
    familie: "fix",
    leistungSlugs: ["elektroarbeiten", "stromausfall"],
    leistungen: [
      "Fehlersuche in Leitung & Verteilung",
      "Ursache beheben oder umgehen",
      "Funktionsprüfung aller Kreise",
      "Sicherheitshinweise vor Ort",
    ],
    scopeVersion: "1.2",
    situation: "kaputt",
    bereiche: ["elektro"],
  },
  {
    slug: "fix-heizung-kalt",
    titel: "Heizung wird nicht warm",
    kurz: "Heizkörper bleiben kalt, Anlage läuft",
    familie: "fix",
    leistungSlugs: ["heizung-sanitaer", "heizung-defekt"],
    leistungen: [
      "Erste Diagnose vor Ort",
      "Entlüften, Ventil & Zirkulation prüfen",
      "Kleinreparatur wenn möglich",
      "Empfehlung bei größerem Defekt",
    ],
    scopeVersion: "1.2",
    situation: "kaputt",
    bereiche: ["heizung"],
  },
  {
    slug: "fix-kein-warmwasser",
    titel: "Kein Warmwasser",
    kurz: "Dusche oder Zapfstellen bleiben kalt",
    familie: "fix",
    leistungSlugs: ["heizung-sanitaer", "heizung-defekt"],
    leistungen: [
      "Warmwasser-Bereitung prüfen",
      "Speicher, Brenner oder Mischer checken",
      "Kleinreparatur wenn möglich",
      "Klare Empfehlung für Folge-Schritte",
    ],
    scopeVersion: "1.2",
    situation: "kaputt",
    bereiche: ["heizung"],
  },
  {
    slug: "fix-heizung-stoerung",
    titel: "Brennerstörung / Druckverlust",
    kurz: "Fehlermeldung, Anlage fällt aus oder verliert Druck",
    familie: "fix",
    leistungSlugs: ["heizung-sanitaer", "heizung-defekt"],
    leistungen: [
      "Störungscode & Anlage auslesen",
      "Druck & Sicherheit prüfen",
      "Erste Instandsetzung vor Ort",
      "Transparente Empfehlung bei Ersatzteilen",
    ],
    scopeVersion: "1.2",
    situation: "kaputt",
    bereiche: ["heizung"],
  },
];

export const FIX_DEFAULT_PRODUKT_SLUG = "fix-verstopfung";

export function getFixGewerk(produkt: Produkt): FixGewerkId {
  if (produkt.bereiche.includes("heizung")) return "heizung";
  if (produkt.bereiche.includes("elektro")) return "elektro";
  return "sanitaer";
}

export function getFixProdukteByGewerk(gewerk: FixGewerkId): Produkt[] {
  return FIX_PRODUKTE.filter((p) => getFixGewerk(p) === gewerk);
}

export function getDefaultFixSlugForGewerk(gewerk: FixGewerkId): string {
  return getFixProdukteByGewerk(gewerk)[0]?.slug ?? FIX_DEFAULT_PRODUKT_SLUG;
}
