/**
 * Portal 2.0 Design-Tokens — Mock `const C`
 * Quelle: Baerenwald Portale (5).html (identisch zu v3 `const C`).
 *
 * `body` steht nicht in `const C`, sondern in der Mock-CSS-Regel `body { font-family: … }`.
 * Werte unverändert (keine Rundung).
 */

export const PORTAL_C = {
  bg: "#e6e8e6",
  panel: "#ffffff",
  line: "rgba(0,0,0,0.08)",
  line2: "rgba(0,0,0,0.05)",
  ink: "#16201B",
  sub: "#404A45",
  faint: "#6A746F",
  faint2: "#9AA39E",
  primary: "#2E7D52",
  primaryDk: "#2a724b",
  primarySoft: "#E7F1E9",
  greenDark: "#1A3D2B",
  green50: "#E7F1E9",
  shadow: "0 1px 3px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)",
  head: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, Roboto, sans-serif",
  body: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', system-ui, Roboto, 'Helvetica Neue', Arial, sans-serif",
} as const;

export type PortalTokenKey = keyof typeof PORTAL_C;

/** CSS-Custom-Property-Namen für Portal-Kontext (`.portal-ui` / WL-Root). */
export const PORTAL_CSS_VARS = {
  bg: "--p2-bg",
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
  shadow: "--p2-shadow",
  head: "--p2-font-head",
  body: "--p2-font-body",
  /** Branding-Overrides (A2) */
  brandPrimary: "--org-primary",
  brandPrimaryDk: "--org-primary-dk",
  brandSoft: "--org-primary-soft",
} as const;

/** Inline-Style mit allen Default-Tokens (ohne Brand-Override). */
export function portalTokenStyle(): Record<string, string> {
  return {
    [PORTAL_CSS_VARS.bg]: PORTAL_C.bg,
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
    [PORTAL_CSS_VARS.shadow]: PORTAL_C.shadow,
    [PORTAL_CSS_VARS.head]: PORTAL_C.head,
    [PORTAL_CSS_VARS.body]: PORTAL_C.body,
  };
}
