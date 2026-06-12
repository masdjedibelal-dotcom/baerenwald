import type { BadAusstattungStufe, Produkt, ProduktGroesse } from "./types";

/** Nutzer-sichtbarer Name der Produktfamilie (intern: bad, Chip-ID: projekt). */
export const BAD_FAMILIE_LABEL = "Neues Bad";

const BAD_LEISTUNGEN_STANDARD = [
  "Demontage & Entsorgung",
  "Sanitär, Fliesen & Elektro",
  "Abdichtung & Untergrund",
  "Ein Ansprechpartner für alle Gewerke",
  "Festpreis nach Besichtigung",
];

const BAD_LEISTUNGEN_KOMFORT = [
  ...BAD_LEISTUNGEN_STANDARD,
  "Bodengleiche Dusche",
  "Hochwertigere Armaturen & Nischen",
];

const BAD_LEISTUNGEN_GEHOBEN = [
  ...BAD_LEISTUNGEN_KOMFORT,
  "Premium-Fliesen & Design-Armaturen",
  "Indirekte Beleuchtung & Design-Spiegel",
];

function badLeistungen(stufe: BadAusstattungStufe): string[] {
  if (stufe === "gehoben") return BAD_LEISTUNGEN_GEHOBEN;
  if (stufe === "komfort") return BAD_LEISTUNGEN_KOMFORT;
  return BAD_LEISTUNGEN_STANDARD;
}

const GROESSE_META: Record<
  ProduktGroesse,
  { qm: number; label: string; titelPrefix: string }
> = {
  s: { qm: 4, label: "S", titelPrefix: "Klein" },
  m: { qm: 6, label: "M", titelPrefix: "Mittel" },
  l: { qm: 10, label: "L", titelPrefix: "Groß" },
};

const STUFEN: BadAusstattungStufe[] = ["standard", "komfort", "gehoben"];

const STUFEN_LABEL: Record<BadAusstattungStufe, string> = {
  standard: "Standard",
  komfort: "Komfort",
  gehoben: "Gehoben",
};

function badProdukt(
  groesse: ProduktGroesse,
  stufe: BadAusstattungStufe
): Produkt {
  const g = GROESSE_META[groesse];
  const stufeLabel = STUFEN_LABEL[stufe];
  return {
    slug: `bad-${groesse}-${stufe}`,
    titel: `Bad ${stufeLabel} ${g.label}`,
    kurz: `${g.titelPrefix} (ca. ${g.qm} m²) · ${stufeLabel}`,
    familie: "bad",
    leistungSlugs: ["badezimmer-sanierung", "bad-sanieren"],
    groesse,
    stufe,
    leistungen: badLeistungen(stufe),
    scopeVersion: "1.0",
    groesseQm: g.qm,
    situation: "erneuern",
    bereiche: ["bad"],
  };
}

export const BAD_PRODUKTE: Produkt[] = (["s", "m", "l"] as ProduktGroesse[]).flatMap(
  (groesse) => STUFEN.map((stufe) => badProdukt(groesse, stufe))
);

export const BAD_DEFAULT_PRODUKT_SLUG = "bad-m-komfort";
