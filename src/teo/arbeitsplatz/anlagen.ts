/** Anlagen-Arten (Auswahl im Objekt). */
export const ANLAGE_ARTEN = ['heizung', 'aufzug', 'rauchmelder', 'feuerloescher', 'lueftung', 'trinkwasser', 'tor', 'spielplatz', 'sonstiges'] as const
export type AnlageArt = (typeof ANLAGE_ARTEN)[number]
export const ANLAGE_ART_LABEL: Record<AnlageArt, string> = {
  heizung: 'Heizung',
  aufzug: 'Aufzug',
  rauchmelder: 'Rauchmelder',
  feuerloescher: 'Feuerlöscher',
  lueftung: 'Lüftung',
  trinkwasser: 'Trinkwasser',
  tor: 'Tor / Schranke',
  spielplatz: 'Spielplatz',
  sonstiges: 'Sonstiges',
}

export type ApAnlage = { id: string; objektId: string; name: string; art: AnlageArt; baujahr: number | null; notiz: string | null }
export type AnlageFelder = { name: string; art: AnlageArt; baujahr: string; notiz: string }
