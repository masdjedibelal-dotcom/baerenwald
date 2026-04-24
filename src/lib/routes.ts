/** Zentrale Marketing-Routen (Leistungen, Ratgeber) */

/** Hero / Kalkulation: Kategorie für Vorschläge und Badges */
export type LeistungKategorie = "projekt" | "reparatur" | "service";

export interface LeistungRoute {
  slug: string;
  label: string;
  /** Leer — Hero-Vorschläge ohne Icons */
  icon: string;
  kurz: string;
  hint: string;
  category: LeistungKategorie;
}

export const LEISTUNGEN: LeistungRoute[] = [
  {
    slug: "dachbodenausbau",
    label: "Dachbodenausbau",
    icon: "",
    kurz: "DG, Dachboden zu Wohnraum ausbauen",
    hint: "Neuer Wohnraum unter dem Dach, Rohbau, Statik",
    category: "projekt",
  },
  {
    slug: "kellerausbau",
    label: "Kellerausbau",
    icon: "",
    kurz: "Keller trockenlegen und nutzbar machen",
    hint: "Feuchteschutz, Ausbau, Trockenlegung",
    category: "projekt",
  },
  {
    slug: "wanddurchbruch",
    label: "Wanddurchbruch",
    icon: "",
    kurz: "Raum öffnen, tragend oder nicht tragend",
    hint: "Statik, Stahlträger, Durchbruch",
    category: "projekt",
  },
  {
    slug: "terrassenbau",
    label: "Terrassenbau",
    icon: "",
    kurz: "Neue Terrasse Holz oder Stein",
    hint: "Unterbau, Erdarbeiten, Terrasse neu",
    category: "projekt",
  },
  {
    slug: "gartengestaltung",
    label: "Gartengestaltung",
    icon: "",
    kurz: "Garten neu planen und anlegen",
    hint: "Wege, Bepflanzung, Neuanlage",
    category: "projekt",
  },
  {
    slug: "bad-sanieren",
    label: "Bad sanieren",
    icon: "",
    kurz: "Bad modernisieren oder neu",
    hint: "Fliesen, Sanitär, komplett neu",
    category: "service",
  },
  {
    slug: "boden-verlegen",
    label: "Boden verlegen",
    icon: "",
    kurz: "Laminat, Parkett, Fliesen",
    hint: "Neuer Boden innen",
    category: "service",
  },
  {
    slug: "fassadendaemmung",
    label: "Fassadendämmung",
    icon: "",
    kurz: "WDVS, Dämmung, Fassade",
    hint: "Energetisch dämmen, Anstrich",
    category: "service",
  },
  {
    slug: "heizung-defekt",
    label: "Heizung defekt",
    icon: "",
    kurz: "Heizung geht nicht, kein Warmwasser",
    hint: "Ausfall, Störung, Heizungsnotfall",
    category: "reparatur",
  },
  {
    slug: "rohrbruch",
    label: "Rohrbruch",
    icon: "",
    kurz: "Wasser, Leck, Sanitär",
    hint: "Rohr undicht, Verstopfung",
    category: "reparatur",
  },
  {
    slug: "stromausfall",
    label: "Stromausfall",
    icon: "",
    kurz: "Sicherung, Elektrik, Steckdose",
    hint: "Strom weg, Elektro defekt",
    category: "reparatur",
  },
  {
    slug: "dachschaden",
    label: "Dachschaden",
    icon: "",
    kurz: "Undicht, Sturm, Regenrinne",
    hint: "Dach reparieren, Ziegel",
    category: "reparatur",
  },
  {
    slug: "winterdienst",
    label: "Winterdienst",
    icon: "",
    kurz: "Räumen und Streuen",
    hint: "Streupflicht, Gehweg",
    category: "service",
  },
  {
    slug: "gartenpflege",
    label: "Gartenpflege",
    icon: "",
    kurz: "Mähen, schneiden, pflegen",
    hint: "Regelmäßige Gartenbetreuung",
    category: "service",
  },
  {
    slug: "baumarbeiten",
    label: "Baumarbeiten",
    icon: "",
    kurz: "Fällen, zurückschneiden",
    hint: "Baum, Kronenschnitt",
    category: "service",
  },
  {
    slug: "hausmeisterservice",
    label: "Hausmeisterservice",
    icon: "",
    kurz: "Alles aus einer Hand",
    hint: "Objektbetreuung, Koordination",
    category: "service",
  },
];

export interface RatgeberRoute {
  slug: string;
  label: string;
}

export const RATGEBER: RatgeberRoute[] = [
  {
    slug: "malerarbeiten-kosten-muenchen",
    label: "Was kosten Malerarbeiten?",
  },
  {
    slug: "bad-sanierung-kosten-muenchen",
    label: "Was kostet eine Badsanierung?",
  },
  {
    slug: "bodenbelag-kosten-muenchen",
    label: "Was kostet neuer Boden?",
  },
  {
    slug: "heizung-tauschen-kosten",
    label: "Heizung tauschen — was kostet das?",
  },
  {
    slug: "wohnung-renovieren-kosten-muenchen",
    label: "Wohnung renovieren — Gesamtkosten",
  },
  {
    slug: "gartenpflege-kosten-muenchen",
    label: "Was kostet Gartenpflege?",
  },
  {
    slug: "winterdienst-kosten-muenchen",
    label: "Was kostet Winterdienst?",
  },
  {
    slug: "waermepumpe-foerderung-2025",
    label: "Wärmepumpe Förderung 2025",
  },
  {
    slug: "bad-renovieren-ablauf",
    label: "Bad modernisieren — Schritt für Schritt",
  },
  {
    slug: "fenster-tauschen-kosten",
    label: "Fenster tauschen — Kosten & Ablauf",
  },
  {
    slug: "trockenbau-kosten-muenchen",
    label: "Neue Wände — was kostet das?",
  },
  {
    slug: "dacharbeiten-kosten-muenchen",
    label: "Dacharbeiten Kosten München",
  },
];

export function leistungHref(slug: string): string {
  return `/leistungen/${slug}-muenchen`;
}

export function ratgeberHref(slug: string): string {
  return `/ratgeber/${slug}`;
}

/** Erste sechs Ratgeber für Footer-Highlight */
export const RATGEBER_FOOTER_HIGHLIGHTS = RATGEBER.slice(0, 6);
