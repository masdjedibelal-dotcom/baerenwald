/**
 * Portal 2.0 Sidebar-Nav — Mock `navItems()` 1:1.
 * Quelle: Baerenwald Portale (5).html
 *
 * App-Section-IDs bleiben portal-spezifisch; `key` ist der Mock-Screen-Key.
 * N4/N8: einheitliche Labels; `mieter` entfernt (Mieter = kunde_privat).
 */

export type PortalNavRole =
  | "kunde_hv"
  | "kunde_privat"
  | "eigentuemer"
  | "hausmeister"
  | "handwerker";

/** Mock-Keys aus `navItems()` / `setScreen(k)`. */
export type PortalNavKey =
  | "home"
  | "liste"
  | "objekte"
  | "servicepakete"
  | "marktplatz"
  | "settings"
  | "mehr";

export type PortalNavItemDef = {
  key: PortalNavKey;
  label: string;
  glyph: string;
  tag?: string;
};

/** Kanonische Labels je Section-Familie (N4) — Guard prüft Parität. */
export const PORTAL_NAV_FAMILY_LABELS = {
  home: "Übersicht",
  liste: "Vorgänge",
  objekte: "Objekte",
  settings: "Einstellungen",
} as const;

export const PORTAL_NAV_ITEMS: Record<PortalNavRole, readonly PortalNavItemDef[]> =
  {
    kunde_hv: [
      { key: "home", label: PORTAL_NAV_FAMILY_LABELS.home, glyph: "◈" },
      { key: "liste", label: PORTAL_NAV_FAMILY_LABELS.liste, glyph: "▤" },
      { key: "objekte", label: PORTAL_NAV_FAMILY_LABELS.objekte, glyph: "▦" },
      {
        key: "servicepakete",
        label: "Serviceabos",
        glyph: "◇",
        tag: "In Kürze",
      },
      {
        key: "marktplatz",
        label: "Marktplatz",
        glyph: "▣",
        tag: "In Kürze",
      },
      { key: "settings", label: PORTAL_NAV_FAMILY_LABELS.settings, glyph: "⚙" },
    ],
    kunde_privat: [
      { key: "home", label: PORTAL_NAV_FAMILY_LABELS.home, glyph: "◈" },
      { key: "liste", label: PORTAL_NAV_FAMILY_LABELS.liste, glyph: "▤" },
      { key: "settings", label: PORTAL_NAV_FAMILY_LABELS.settings, glyph: "⚙" },
    ],
    eigentuemer: [
      { key: "home", label: PORTAL_NAV_FAMILY_LABELS.home, glyph: "◈" },
      { key: "liste", label: PORTAL_NAV_FAMILY_LABELS.liste, glyph: "▤" },
      { key: "objekte", label: PORTAL_NAV_FAMILY_LABELS.objekte, glyph: "▦" },
    ],
    /** N4: gleiche Labels wie Eigentümer. */
    hausmeister: [
      { key: "home", label: PORTAL_NAV_FAMILY_LABELS.home, glyph: "◈" },
      { key: "liste", label: PORTAL_NAV_FAMILY_LABELS.liste, glyph: "▤" },
      { key: "objekte", label: PORTAL_NAV_FAMILY_LABELS.objekte, glyph: "▦" },
    ],
    /**
     * N4: Übersicht · Vorgänge · Einstellungen
     * (Inhalt Settings = Firmendaten; Label bleibt Einstellungen.)
     */
    handwerker: [
      { key: "home", label: PORTAL_NAV_FAMILY_LABELS.home, glyph: "◈" },
      { key: "liste", label: PORTAL_NAV_FAMILY_LABELS.liste, glyph: "▤" },
      { key: "settings", label: PORTAL_NAV_FAMILY_LABELS.settings, glyph: "⚙" },
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
  tag?: string;
}[] = [
  {
    key: "servicepakete",
    label: "Serviceabos",
    glyph: "◇",
    tag: "In Kürze",
  },
  {
    key: "marktplatz",
    label: "Marktplatz",
    glyph: "▣",
    tag: "In Kürze",
  },
  { key: "settings", label: PORTAL_NAV_FAMILY_LABELS.settings, glyph: "⚙" },
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
    marktplatz: "marktplatz",
    settings: "profil",
    mehr: "mehr",
  },
  kunde: {
    home: "uebersicht",
    liste: "vorgaenge",
    settings: "profil",
  },
  /** Eigentümer — Übersicht · Vorgänge · Objekte */
  eigentuemer: {
    home: "uebersicht",
    liste: "vorgaenge",
    objekte: "objekte",
  },
  /** Hausmeister — gleiche Sections wie Eigentümer */
  hausmeister: {
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
  /** z. B. „In Kürze“ — Inline-Badge hinter dem Label (Deep Green) */
  tag?: string;
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
        ...(item.tag ? { tag: item.tag } : {}),
      },
    ];
  });
}

/** Mobile Bottom-Nav für HV (ohne Service/Settings — die liegen unter Mehr). */
export function buildPortalHvMobileNav(
  badges?: Partial<Record<PortalNavKey, number>>
): PortalShellNavBuilt[] {
  const defs: Record<string, PortalNavItemDef> = {
    home: {
      key: "home",
      label: PORTAL_NAV_FAMILY_LABELS.home,
      glyph: "◈",
    },
    liste: {
      key: "liste",
      label: PORTAL_NAV_FAMILY_LABELS.liste,
      glyph: "▤",
    },
    objekte: {
      key: "objekte",
      label: PORTAL_NAV_FAMILY_LABELS.objekte,
      glyph: "▦",
    },
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
