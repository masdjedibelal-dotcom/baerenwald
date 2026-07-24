/**
 * Portal 2.0 B8 — Mock `modalNeueAnfrage` Optionen.
 * Quelle: Baerenwald Portale (5).html
 */

export type PortalNeueAnfrageActionId =
  | "meldung"
  | "einladen"
  | "projekt"
  | "manuell"
  | "servicepaket";

export type PortalNeueAnfrageOption = {
  id: PortalNeueAnfrageActionId;
  title: string;
  subtitle: string;
  glyph: string;
};

/** Exakte Mock-Texte / Reihenfolge. */
export const PORTAL_NEUE_ANFRAGE_OPTIONS: readonly PortalNeueAnfrageOption[] = [
  {
    id: "meldung",
    title: "Meldung anlegen",
    subtitle: "Schaden oder Anliegen selbst erfassen",
    glyph: "▤",
  },
  {
    id: "einladen",
    title: "Mieter einladen",
    subtitle: "Einladungslink zum Melden erzeugen",
    glyph: "✉",
  },
  {
    id: "projekt",
    title: "Projekt / Sanierung",
    subtitle: "Größeres Vorhaben mit mehreren Gewerken",
    glyph: "▧",
  },
  {
    id: "manuell",
    title: "Manueller Vorgang",
    subtitle: "Freitext-Vorgang ohne Formular",
    glyph: "✎",
  },
  {
    id: "servicepaket",
    title: "Servicepaket bestellen",
    subtitle: "Aus dem Leistungskatalog wählen",
    glyph: "◇",
  },
] as const;

export const PORTAL_NEUE_ANFRAGE_TITLE = "Neue Anfrage";
export const PORTAL_NEUE_ANFRAGE_SUBTITLE = "Wie möchten Sie starten?";
