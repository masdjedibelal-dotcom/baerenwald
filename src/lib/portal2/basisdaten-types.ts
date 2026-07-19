/**
 * Portal 2.0 A7 — Basisdaten-Anzeigeformen (Mock MELDE_OBJEKTE / MELDE_SLOTS / HANDWERKER).
 * Keine Demo-Stammdaten: immer aus realen Tabellen/Feldern mappen.
 */

/** Mock `MELDE_OBJEKTE[]` — Anzeigeform eines Objekts. */
export type MeldeObjektDisplay = {
  id: string;
  /** Objektname / Titel */
  name: string;
  /** Adresszeile (Mock: „10115 Berlin-Mitte“) */
  adr: string;
  /**
   * Einheiten-Hinweis (Mock: „6 Wohneinheiten“ / „Einfamilienhaus“).
   * `null` = nicht anzeigen (kein Fake).
   */
  we: string | null;
};

/** Mock `MELDE_SLOTS[]` — Tupel [Datum, Uhrzeit-Fenster]. */
export type MeldeSlotDisplay = readonly [dateLabel: string, timeLabel: string];

/** Mock `HANDWERKER[]` — Anzeigeform. */
export type HandwerkerDisplay = {
  id: string;
  name: string;
  /** Gewerke, Mock-Feld `trade` („Sanitär · Heizung“) */
  trade: string;
  /**
   * Nur setzen, wenn echte Bewertungsdaten existieren.
   * Sonst Feld weglassen — kein Fake-Rating.
   */
  rating?: number;
};

export type MeldeObjektSource = {
  id: string;
  titel?: string | null;
  name?: string | null;
  strasse?: string | null;
  hausnummer?: string | null;
  plz?: string | null;
  ort?: string | null;
  /** Freitext aus `kunden_objekte.einheiten_hinweis` */
  einheiten_hinweis?: string | null;
  /**
   * Optional: Anzahl aus `objekt_einheiten` (Teil E).
   * Nur wenn `einheiten_hinweis` leer → „{n} Wohneinheiten“.
   */
  einheitenCount?: number | null;
};

export type MeldeSlotSource = {
  slot_beginn: string;
  slot_ende?: string | null;
};

export type HandwerkerDisplaySource = {
  id: string;
  firma?: string | null;
  name?: string | null;
  vorname?: string | null;
  nachname?: string | null;
  /** Bereits aufgelöste Gewerk-Namen (nicht Slugs). */
  gewerkNamen?: string[] | null;
  /** Roh-Slugs, falls Namen fehlen. */
  gewerke?: string[] | null;
  bewertung_gesamt?: number | null;
  bewertung_anzahl?: number | null;
};
