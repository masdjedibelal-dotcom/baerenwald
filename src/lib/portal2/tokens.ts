/**
 * Portal 2.0 Design-Tokens — Single Source.
 * Hex-Werte in PORTAL_C; Inline-Styles nutzen PORTAL_VAR (CSS-Vars + Brand).
 */

export const PORTAL_C = {
  /** Seitenhintergrund — leicht abgesetzt für Ruhe vs. weiße Panels */
  bg: "#F3F5F4",
  bgContent: "#F3F5F4",
  panel: "#ffffff",
  line: "rgba(0,0,0,0.09)",
  line2: "rgba(0,0,0,0.06)",
  ink: "#142019",
  /** Sekundärtext: dunkler als zuvor für Lesbarkeit */
  sub: "#2E3833",
  faint: "#55615B",
  faint2: "#7A857F",
  primary: "#2E7D52",
  primaryDk: "#2a724b",
  primarySoft: "#E7F1E9",
  greenDark: "#1A3D2B",
  green50: "#E7F1E9",
  hover: "#EEF1EF",
  selected: "#E8ECE9",
  danger: "#A1242A",
  dangerSoft: "#FCE3E3",
  dangerBorder: "#F5C2C0",
  shadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)",
  radiusSm: "8px",
  radiusMd: "12px",
  radiusLg: "16px",
  radiusSheet: "20px",
  /** Lesbare Skala — identisch zu --p2-type-* in globals.css */
  typeMeta: "15.5px",
  typeBody: "18px",
  typeTitle: "20px",
  typeLabel: "13.75px",
  head: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, Roboto, sans-serif",
  body: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', system-ui, Roboto, 'Helvetica Neue', Arial, sans-serif",
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
  danger: "var(--p2-danger)",
  dangerSoft: "var(--p2-danger-soft)",
  dangerBorder: "var(--p2-danger-border)",
  shadow: "var(--p2-shadow)",
  radiusSm: "var(--p2-radius-sm)",
  radiusMd: "var(--p2-radius-md)",
  radiusLg: "var(--p2-radius-lg)",
  radiusSheet: "var(--p2-radius-sheet)",
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
  danger: "--p2-danger",
  dangerSoft: "--p2-danger-soft",
  dangerBorder: "--p2-danger-border",
  shadow: "--p2-shadow",
  radiusSm: "--p2-radius-sm",
  radiusMd: "--p2-radius-md",
  radiusLg: "--p2-radius-lg",
  radiusSheet: "--p2-radius-sheet",
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
    [PORTAL_CSS_VARS.danger]: PORTAL_C.danger,
    [PORTAL_CSS_VARS.dangerSoft]: PORTAL_C.dangerSoft,
    [PORTAL_CSS_VARS.dangerBorder]: PORTAL_C.dangerBorder,
    [PORTAL_CSS_VARS.shadow]: PORTAL_C.shadow,
    [PORTAL_CSS_VARS.radiusSm]: PORTAL_C.radiusSm,
    [PORTAL_CSS_VARS.radiusMd]: PORTAL_C.radiusMd,
    [PORTAL_CSS_VARS.radiusLg]: PORTAL_C.radiusLg,
    [PORTAL_CSS_VARS.radiusSheet]: PORTAL_C.radiusSheet,
    [PORTAL_CSS_VARS.head]: PORTAL_C.head,
    [PORTAL_CSS_VARS.body]: PORTAL_C.body,
  };
}
