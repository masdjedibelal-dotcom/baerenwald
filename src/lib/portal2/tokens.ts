/**
 * Portal 2.0 Design-Tokens — Deep Green (Handoff 31.08.2026).
 * Hex-Werte in PORTAL_C; Inline-Styles nutzen PORTAL_VAR (CSS-Vars + Brand).
 * Quelle: design_handoff_portal_deep_green/02-design-tokens.md
 */

export const PORTAL_C = {
  /** App-Hintergrund / Content-Fläche */
  bg: "#F5F6F4",
  bgContent: "#F5F6F4",
  panel: "#FFFFFF",
  /** Linie neutral (Listenkante, Fortschritt inaktiv) */
  line: "#DFE4E0",
  /** Trennlinie in Karten */
  line2: "rgba(20,32,25,0.07)",
  /** Text primär */
  ink: "#142019",
  /** Text sekundär */
  sub: "#55615B",
  /** Text tertiär / Meta */
  faint: "#8A938E",
  /** Icon inaktiv */
  faint2: "#9AA39E",
  /** Marken-Grün — Primär-Button, Links, aktive Marker */
  primary: "#2E7D52",
  /** Marken-Grün dunkel — Sidebar, Hero, Bottom-Nav */
  primaryDk: "#1A3D2B",
  /** Grün hell (Fläche) */
  primarySoft: "#EEF4F0",
  greenDark: "#1A3D2B",
  green50: "#EEF4F0",
  hover: "#EEF4F0",
  selected: "#FFFFFF",
  /** Sand — Sekundär-Akzent (Entscheidung / Badge) */
  sand: "#E8B04B",
  sandText: "#8A5A06",
  /** Skeleton-Fläche */
  skeleton: "#EEF1EF",
  danger: "#A1242A",
  dangerSoft: "#FBECEB",
  dangerBorder: "#F5C2C0",
  /** Karte Ruhe */
  shadow: "0 2px 10px rgba(16,32,24,0.05)",
  shadowHover: "0 8px 24px rgba(16,32,24,0.10)",
  shadowFocus: "0 10px 30px rgba(16,32,24,0.10)",
  shadowPrimaryBtn: "0 8px 20px rgba(46,125,82,0.28)",
  shadowNav: "0 14px 32px rgba(16,32,24,0.30)",
  shadowSheet: "0 -10px 60px rgba(0,0,0,0.30)",
  /** Icon-Kachel klein */
  radiusSm: "12px",
  /** Listenkarte / Objektkarte / Hero-Streifen */
  radiusMd: "18px",
  /** Karte / Sektion / Modal */
  radiusLg: "22px",
  /** Mobil-Bottom-Sheet oben */
  radiusSheet: "28px",
  /** Overlay hinter Modals / Slide-overs */
  scrim: "rgba(16,25,20,0.60)",
  /** Typo-Skala Deep Green */
  typeMeta: "13.5px",
  typeBody: "14.5px",
  typeTitle: "17px",
  typeLabel: "13px",
  typeSection: "18px",
  typePage: "30px",
  typeNav: "14px",
  typeHeroDesktop: "34px",
  typeHeroMobile: "28px",
  typeEyebrow: "11.5px",
  typeStatus: "12.5px",
  typeKpiCard: "24px",
  typeKpiHero: "30px",
  typeMoney: "24px",
  head: "'Plus Jakarta Sans', -apple-system, 'Segoe UI', system-ui, sans-serif",
  body: "'Plus Jakarta Sans', -apple-system, 'Segoe UI', system-ui, sans-serif",
} as const;

export type PortalTokenKey = keyof typeof PORTAL_C;

/**
 * Inline-Style-Werte — respektieren Org-Brand (--org-primary*).
 * Statt `PORTAL_C.primary` in style={{}} verwenden.
 */
export const PORTAL_VAR = {
  bg: "var(--p2-bg)",
  bgContent: "var(--p2-bg-content)",
  panel: "var(--p2-panel)",
  line: "var(--p2-line)",
  line2: "var(--p2-line2)",
  ink: "var(--p2-ink)",
  sub: "var(--p2-sub)",
  faint: "var(--p2-faint)",
  faint2: "var(--p2-faint2)",
  primary: "var(--org-primary, var(--p2-primary))",
  primaryDk: "var(--org-primary-dk, var(--p2-primary-dk))",
  primarySoft: "var(--org-primary-soft, var(--p2-primary-soft))",
  greenDark: "var(--p2-green-dark)",
  green50: "var(--p2-green-50)",
  hover: "var(--p2-hover)",
  selected: "var(--p2-selected)",
  sand: "var(--p2-sand)",
  sandText: "var(--p2-sand-text)",
  skeleton: "var(--p2-skeleton)",
  danger: "var(--p2-danger)",
  dangerSoft: "var(--p2-danger-soft)",
  dangerBorder: "var(--p2-danger-border)",
  shadow: "var(--p2-shadow)",
  shadowHover: "var(--p2-shadow-hover)",
  shadowFocus: "var(--p2-shadow-focus)",
  shadowPrimaryBtn: "var(--p2-shadow-primary-btn)",
  shadowNav: "var(--p2-shadow-nav)",
  shadowSheet: "var(--p2-shadow-sheet)",
  radiusSm: "var(--p2-radius-sm)",
  radiusMd: "var(--p2-radius-md)",
  radiusLg: "var(--p2-radius-lg)",
  radiusSheet: "var(--p2-radius-sheet)",
  scrim: "var(--p2-scrim)",
  head: "var(--p2-font-head)",
  body: "var(--p2-font-body)",
} as const;

/** CSS-Custom-Property-Namen für Portal-Kontext (`.portal-ui` / WL-Root). */
export const PORTAL_CSS_VARS = {
  bg: "--p2-bg",
  bgContent: "--p2-bg-content",
  panel: "--p2-panel",
  line: "--p2-line",
  line2: "--p2-line2",
  ink: "--p2-ink",
  sub: "--p2-sub",
  faint: "--p2-faint",
  faint2: "--p2-faint2",
  primary: "--p2-primary",
  primaryDk: "--p2-primary-dk",
  primarySoft: "--p2-primary-soft",
  greenDark: "--p2-green-dark",
  green50: "--p2-green-50",
  hover: "--p2-hover",
  selected: "--p2-selected",
  sand: "--p2-sand",
  sandText: "--p2-sand-text",
  skeleton: "--p2-skeleton",
  danger: "--p2-danger",
  dangerSoft: "--p2-danger-soft",
  dangerBorder: "--p2-danger-border",
  shadow: "--p2-shadow",
  shadowHover: "--p2-shadow-hover",
  shadowFocus: "--p2-shadow-focus",
  shadowPrimaryBtn: "--p2-shadow-primary-btn",
  shadowNav: "--p2-shadow-nav",
  shadowSheet: "--p2-shadow-sheet",
  radiusSm: "--p2-radius-sm",
  radiusMd: "--p2-radius-md",
  radiusLg: "--p2-radius-lg",
  radiusSheet: "--p2-radius-sheet",
  scrim: "--p2-scrim",
  head: "--p2-font-head",
  body: "--p2-font-body",
  brandPrimary: "--org-primary",
  brandPrimaryDk: "--org-primary-dk",
  brandSoft: "--org-primary-soft",
} as const;

/** Inline-Style mit allen Default-Tokens (ohne Brand-Override). */
export function portalTokenStyle(): Record<string, string> {
  return {
    [PORTAL_CSS_VARS.bg]: PORTAL_C.bg,
    [PORTAL_CSS_VARS.bgContent]: PORTAL_C.bgContent,
    [PORTAL_CSS_VARS.panel]: PORTAL_C.panel,
    [PORTAL_CSS_VARS.line]: PORTAL_C.line,
    [PORTAL_CSS_VARS.line2]: PORTAL_C.line2,
    [PORTAL_CSS_VARS.ink]: PORTAL_C.ink,
    [PORTAL_CSS_VARS.sub]: PORTAL_C.sub,
    [PORTAL_CSS_VARS.faint]: PORTAL_C.faint,
    [PORTAL_CSS_VARS.faint2]: PORTAL_C.faint2,
    [PORTAL_CSS_VARS.primary]: PORTAL_C.primary,
    [PORTAL_CSS_VARS.primaryDk]: PORTAL_C.primaryDk,
    [PORTAL_CSS_VARS.primarySoft]: PORTAL_C.primarySoft,
    [PORTAL_CSS_VARS.greenDark]: PORTAL_C.greenDark,
    [PORTAL_CSS_VARS.green50]: PORTAL_C.green50,
    [PORTAL_CSS_VARS.hover]: PORTAL_C.hover,
    [PORTAL_CSS_VARS.selected]: PORTAL_C.selected,
    [PORTAL_CSS_VARS.sand]: PORTAL_C.sand,
    [PORTAL_CSS_VARS.sandText]: PORTAL_C.sandText,
    [PORTAL_CSS_VARS.skeleton]: PORTAL_C.skeleton,
    [PORTAL_CSS_VARS.danger]: PORTAL_C.danger,
    [PORTAL_CSS_VARS.dangerSoft]: PORTAL_C.dangerSoft,
    [PORTAL_CSS_VARS.dangerBorder]: PORTAL_C.dangerBorder,
    [PORTAL_CSS_VARS.shadow]: PORTAL_C.shadow,
    [PORTAL_CSS_VARS.shadowHover]: PORTAL_C.shadowHover,
    [PORTAL_CSS_VARS.shadowFocus]: PORTAL_C.shadowFocus,
    [PORTAL_CSS_VARS.shadowPrimaryBtn]: PORTAL_C.shadowPrimaryBtn,
    [PORTAL_CSS_VARS.shadowNav]: PORTAL_C.shadowNav,
    [PORTAL_CSS_VARS.shadowSheet]: PORTAL_C.shadowSheet,
    [PORTAL_CSS_VARS.radiusSm]: PORTAL_C.radiusSm,
    [PORTAL_CSS_VARS.radiusMd]: PORTAL_C.radiusMd,
    [PORTAL_CSS_VARS.radiusLg]: PORTAL_C.radiusLg,
    [PORTAL_CSS_VARS.radiusSheet]: PORTAL_C.radiusSheet,
    [PORTAL_CSS_VARS.scrim]: PORTAL_C.scrim,
    [PORTAL_CSS_VARS.head]: PORTAL_C.head,
    [PORTAL_CSS_VARS.body]: PORTAL_C.body,
  };
}
