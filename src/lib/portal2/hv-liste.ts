/**
 * Portal 2.0 D2 — HV Vorgänge-Liste (`screenListe`, `hvChips`, `pageHead`).
 */

import type { OrgVorgangFilter } from "@/lib/org/org-vorgang-filter";

export const HV_LISTE_PAGE_EYEBROW = "Hausverwaltung" as const;
export const HV_LISTE_PAGE_TITLE = "Vorgänge" as const;

export const HV_CHIPS: Array<{
  id: OrgVorgangFilter;
  label: string;
  /** Badge bei „Offen“. */
  showCount: boolean;
}> = [
  { id: "alle", label: "Alle", showCount: false },
  { id: "offen", label: "Offen", showCount: true },
  { id: "erledigt", label: "Erledigt", showCount: false },
];

export const HV_SECTION_MELDUNGEN = "Meldungen · Eingang" as const;
export const HV_SECTION_ANGEBOTE = "Angebots-Freigabe" as const;
export const HV_SECTION_EMPTY = "Nichts offen" as const;

/** Gelbes Hinweisbanner (Mock screenListe Angebots-Freigabe). */
export const HV_ANGEBOT_BANNER =
  "Bärenwald hat Angebote erstellt — bitte prüfen und freigeben." as const;

export const HV_MELDUNG_ACTIONS = [
  {
    id: "angebot_einfordern" as const,
    label: "Angebot einfordern",
    variant: "primary" as const,
  },
  {
    id: "kleinreparatur_freigeben" as const,
    label: "Kleinreparatur freigeben",
    variant: "ghost" as const,
  },
  {
    id: "ablehnen" as const,
    label: "Ablehnen",
    variant: "danger" as const,
  },
] as const;

export const HV_ANGEBOT_ACTIONS = [
  {
    id: "freigegeben" as const,
    label: "Freigeben",
    variant: "primary" as const,
  },
  {
    id: "abgelehnt" as const,
    label: "Ablehnen",
    variant: "danger" as const,
  },
] as const;

/**
 * Mock `bulkDelVg` — Live: kein physisches Löschen von Vorgängen.
 * UI darf Auswahl zeigen; Aktion → OFFENE-PUNKTE.
 */
export const HV_BULK_DELETE_OFFENER_PUNKT =
  "Bulk-Löschen von Vorgängen ist im Live-Portal nicht erlaubt (Audit/Nachweis). Auswahl bleibt Demo-fähig; Persistenz-Löschen = OFFENE-PUNKTE." as const;

export const HV_BULK_DELETE_DISABLED_HINT =
  "Löschen ist für Vorgänge nicht freigeschaltet." as const;
