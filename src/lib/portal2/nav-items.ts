/**
 * Portal 2.0 Sidebar-Nav — Mock `navItems()` 1:1.
 * Quelle: Baerenwald Portale (5).html
 *
 * App-Section-IDs bleiben portal-spezifisch; `key` ist der Mock-Screen-Key.
 */

export type PortalNavRole =
  | "kunde_hv"
  | "kunde_privat"
  | "eigentuemer"
  | "mieter"
  | "handwerker";

/** Mock-Keys aus `navItems()` / `setScreen(k)`. */
export type PortalNavKey =
  | "home"
  | "liste"
  | "objekte"
  | "servicepakete"
  | "team"
  | "settings";

export type PortalNavItemDef = {
  key: PortalNavKey;
  label: string;
  glyph: string;
};

export const PORTAL_NAV_ITEMS: Record<PortalNavRole, readonly PortalNavItemDef[]> =
  {
    kunde_hv: [
      { key: "home", label: "Dashboard", glyph: "◈" },
      { key: "liste", label: "Vorgänge", glyph: "▤" },
      { key: "objekte", label: "Objekte", glyph: "▦" },
      { key: "servicepakete", label: "Servicepakete", glyph: "◇" },
      { key: "team", label: "Team", glyph: "◎" },
      { key: "settings", label: "Einstellungen", glyph: "⚙" },
    ],
    kunde_privat: [
      { key: "home", label: "Übersicht", glyph: "◈" },
      { key: "liste", label: "Meine Aufträge", glyph: "▤" },
      { key: "settings", label: "Einstellungen", glyph: "⚙" },
    ],
    eigentuemer: [
      { key: "home", label: "Dashboard", glyph: "◈" },
      { key: "liste", label: "Vorgänge", glyph: "▤" },
      { key: "objekte", label: "Objekte", glyph: "▦" },
    ],
    mieter: [
      { key: "home", label: "Start", glyph: "◈" },
      { key: "liste", label: "Meine Meldungen", glyph: "▤" },
      { key: "settings", label: "Konto", glyph: "⚙" },
    ],
    /**
     * Spec-Kurzform „Start · Aufträge“; Mock `navItems` inkl. Firmendaten.
     * Firmendaten bleibt (Mock-Wahrheit).
     */
    handwerker: [
      { key: "home", label: "Start", glyph: "◈" },
      { key: "liste", label: "Aufträge", glyph: "▤" },
      { key: "settings", label: "Firmendaten", glyph: "⚙" },
    ],
  } as const;

export function getPortalNavItems(role: PortalNavRole): readonly PortalNavItemDef[] {
  return PORTAL_NAV_ITEMS[role];
}

/**
 * Mock-Key → bestehende App-Section-IDs (URL/`?section=`).
 * Teil F kann Rollenwahl verdrahten; Mapping bleibt stabil.
 */
export const PORTAL_NAV_SECTION_BY_VARIANT = {
  org: {
    home: "uebersicht",
    liste: "vorgaenge",
    objekte: "objekte",
    servicepakete: "leistungen",
    team: "team",
    settings: "profil",
  },
  kunde: {
    home: "uebersicht",
    liste: "vorgaenge",
    settings: "profil",
  },
  /** D8 Eigentümer — Dashboard · Vorgänge · Objekte */
  eigentuemer: {
    home: "uebersicht",
    liste: "vorgaenge",
    objekte: "objekte",
  },
  partner: {
    home: "uebersicht",
    liste: "vorgaenge",
    settings: "profil",
  },
} as const;

export type PortalNavVariant = keyof typeof PORTAL_NAV_SECTION_BY_VARIANT;

export function portalNavSectionId(
  variant: PortalNavVariant,
  key: PortalNavKey
): string | undefined {
  const map = PORTAL_NAV_SECTION_BY_VARIANT[variant] as Record<
    string,
    string
  >;
  return map[key];
}

/** Shell-Nav aus Rolle + Variant + optionalen Badges. */
export function buildPortalShellNav(
  role: PortalNavRole,
  variant: PortalNavVariant,
  badges?: Partial<Record<PortalNavKey, number>>
): Array<{
  id: string;
  label: string;
  navKey: PortalNavKey;
  glyph: string;
  badge?: number;
}> {
  return getPortalNavItems(role).flatMap((item) => {
    const id = portalNavSectionId(variant, item.key);
    if (!id) return [];
    const badge = badges?.[item.key];
    return [
      {
        id,
        label: item.label,
        navKey: item.key,
        glyph: item.glyph,
        ...(badge != null && badge > 0 ? { badge } : {}),
      },
    ];
  });
}
