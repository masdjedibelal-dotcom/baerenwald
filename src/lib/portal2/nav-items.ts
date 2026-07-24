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
  | "settings"
  | "mehr";

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
      { key: "settings", label: "Einstellungen", glyph: "⚙" },
    ],
    kunde_privat: [
      { key: "home", label: "Übersicht", glyph: "◈" },
      { key: "liste", label: "Vorgänge", glyph: "▤" },
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

/** Mobile Bottom-Nav HV: 2 links · FAB Mitte · 2 rechts (Mehr bündelt Rest). */
export const PORTAL_HV_MOBILE_NAV_KEYS: readonly PortalNavKey[] = [
  "home",
  "liste",
  "objekte",
  "mehr",
] as const;

export const PORTAL_HV_MEHR_TILES: readonly {
  key: PortalNavKey;
  label: string;
  glyph: string;
}[] = [
  { key: "servicepakete", label: "Serviceabos", glyph: "◇" },
  { key: "settings", label: "Einstellungen", glyph: "⚙" },
] as const;

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
    settings: "profil",
    mehr: "mehr",
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

export type PortalShellNavBuilt = {
  id: string;
  label: string;
  navKey: PortalNavKey;
  glyph: string;
  badge?: number;
};

/** Shell-Nav aus Rolle + Variant + optionalen Badges. */
export function buildPortalShellNav(
  role: PortalNavRole,
  variant: PortalNavVariant,
  badges?: Partial<Record<PortalNavKey, number>>
): PortalShellNavBuilt[] {
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

/** Mobile Bottom-Nav für HV (ohne Service/Settings — die liegen unter Mehr). */
export function buildPortalHvMobileNav(
  badges?: Partial<Record<PortalNavKey, number>>
): PortalShellNavBuilt[] {
  const defs: Record<string, PortalNavItemDef> = {
    home: { key: "home", label: "Dashboard", glyph: "◈" },
    liste: { key: "liste", label: "Vorgänge", glyph: "▤" },
    objekte: { key: "objekte", label: "Objekte", glyph: "▦" },
    mehr: { key: "mehr", label: "Mehr", glyph: "⋯" },
  };
  return PORTAL_HV_MOBILE_NAV_KEYS.flatMap((key) => {
    const item = defs[key];
    if (!item) return [];
    const id = portalNavSectionId("org", key);
    if (!id) return [];
    const badge = badges?.[key];
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
