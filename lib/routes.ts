/** Zentrale Marketing-Routen (Leistungen, Ratgeber) */

export interface LeistungRoute {
  slug: string;
  label: string;
  icon: string;
  kurz: string;
  hint: string;
}

export const LEISTUNGEN: LeistungRoute[] = [
  {
    slug: "malerarbeiten",
    label: "Streichen & Tapezieren",
    icon: "🖌️",
    kurz: "Wände, Decken, frischer Anstrich",
    hint: "Wenn die Wohnung alt und abgenutzt aussieht — wir machen sie wieder frisch",
  },
  {
    slug: "badezimmer-sanierung",
    label: "Neues Bad",
    icon: "🚿",
    kurz: "Bad renovieren oder komplett neu",
    hint: "Altes Bad raus, neues rein — oder nur einzelne Teile erneuern",
  },
  {
    slug: "bodenbelag",
    label: "Neuer Boden",
    icon: "🪵",
    kurz: "Laminat, Parkett, Fliesen verlegen",
    hint: "Alter Teppich raus, neuer Boden rein — wir beraten und verlegen",
  },
  {
    slug: "elektroarbeiten",
    label: "Strom & Licht",
    icon: "⚡",
    kurz: "Steckdosen, Licht, Elektrik",
    hint: "Steckdosen nachrüsten, Licht installieren, alte Elektrik modernisieren",
  },
  {
    slug: "heizung-sanitaer",
    label: "Heizung & Wasser",
    icon: "🔧",
    kurz: "Heizung, Rohre, Warmwasser",
    hint: "Heizung tauschen, Rohr reparieren, kein warmes Wasser — wir kommen",
  },
  {
    slug: "gartenpflege",
    label: "Gartenpflege",
    icon: "🌿",
    kurz: "Mähen, Schneiden, Aufräumen",
    hint: "Jemand der den Garten regelmäßig in Schuss hält — ohne dass du dich darum kümmern musst",
  },
  {
    slug: "gartengestaltung",
    label: "Garten neu gestalten",
    icon: "🌳",
    kurz: "Terrasse, Wege, Bepflanzung",
    hint: "Aus einem verwilderten Garten etwas Schönes machen — Planung und Umsetzung aus einer Hand",
  },
  {
    slug: "winterdienst",
    label: "Winterdienst",
    icon: "❄️",
    kurz: "Räumen und Streuen",
    hint: "Gehweg frei, Haftung weg — wir übernehmen deine Streupflicht",
  },
  {
    slug: "hausmeisterservice",
    label: "Jemand der sich um alles kümmert",
    icon: "🏠",
    kurz: "Garten, Reinigung, kleine Reparaturen",
    hint: "Ein Ansprechpartner für alles rund ums Haus — regelmäßig und zuverlässig",
  },
  {
    slug: "fenster-tueren",
    label: "Neue Fenster & Türen",
    icon: "🪟",
    kurz: "Tausch, Reparatur, Abdichten",
    hint: "Alte zugige Fenster tauschen — weniger Lärm, weniger Heizkosten",
  },
  {
    slug: "trockenbau",
    label: "Neue Wände & Decken",
    icon: "🏗️",
    kurz: "Wand einziehen, Zimmer aufteilen",
    hint: "Zimmer teilen, Nische bauen, Decke abhängen — schnell und sauber",
  },
  {
    slug: "dacharbeiten",
    label: "Dach & Regenrinnen",
    icon: "🏡",
    kurz: "Reparatur, Sanierung, Abdichten",
    hint: "Undichtes Dach, Sturmschaden, Regenrinne kaputt — wir reparieren",
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
    label: "Bad renovieren — Schritt für Schritt",
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
