/**
 * C4 — Section-Card-Contract (Portal)
 *
 * Wann Cards, wann flach — verhindert Card-in-Card:
 *
 * FLACH (Page-Chrome, kein Rahmen):
 * - Seitenkopf (Eyebrow, Titel)
 * - Filter, Suche, Tabs/Subnav
 * - Pagination
 * - Listen-Stack-Wrapper um mehrere PortalListCards
 *
 * EINZELNE CARDS (Geschwister auf Page-BG):
 * - Jede PortalListCard / KPI-Kachel / Marktplatz-Kachel
 * - Jede Einstellungs-Section (Logo, Profil, …)
 * - Jede PortalDetailCard-Section im Vorgangs-Detail
 *
 * VERBOTEN:
 * - Filter + Liste in einer gemeinsamen Card
 * - Ganzen Einstellungs-Tab in eine Outer-Card
 * - Card um Card-Grids (Marktplatz: nur Item-Cards)
 *
 * VERSCHACHTELT (innerhalb einer Section-Card):
 * - Toggles / SheetCards im Edit-Modal: eigene Cards OK
 * - Auf der Section-Fläche: `nested` → flache Zeilen (portal-nested-panel)
 */

export const PORTAL_SECTION_CARD_CLASS = "portal-section-card" as const;

export const PORTAL_NESTED_PANEL_CLASS = "portal-nested-panel" as const;

/** Listen & Filter: nie in Section-Card wrappen. */
export const PORTAL_LIST_PAGE_CHROME_CLASS = "portal-list-page-chrome" as const;

/** Flächen auf Page-BG (#f6f7f6): Cards/Boxen immer #fff — siehe --p2-selected, .portal-section-card */
