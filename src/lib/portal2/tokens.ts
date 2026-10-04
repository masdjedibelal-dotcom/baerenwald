/**
 * Portal 2.0 Design-Tokens — Deep Green (Handoff 31.08.2026).
 * Hex-Werte in PORTAL_C; Inline-Styles nutzen PORTAL_VAR (CSS-Vars + Brand).
 * Quelle: design_handoff_portal_deep_green/02-design-tokens.md
 */

export const PORTAL_C = {
  /** App-Hintergrund / Content-Fläche */
  bg: "var(--p2-bg)",
  bgContent: "var(--p2-bg)",
  panel: "var(--p2-panel)",
  /** Linie neutral (Listenkante, Fortschritt inaktiv) */
  line: "var(--p2-line)",
  /** Trennlinie in Karten */
  line2: "rgba(20,32,25,0.07)",
  /** Text primär */
  ink: "var(--p2-ink)",
  /** Text sekundär */
  sub: "var(--p2-sub)",
  /** Text tertiär / Meta */
  faint: "var(--p2-faint)",
  /** Icon inaktiv */
  faint2: "var(--p2-faint2)",
  /** Marken-Grün — Primär-Button, Links, aktive Marker */
  primary: "var(--p2-primary)",
  /** Marken-Grün dunkel — Sidebar, Hero, Bottom-Nav */
  primaryDk: "var(--p2-primary-dk)",
  /** Grün hell (Fläche) */
  primarySoft: "var(--p2-hover)",
  greenDark: "var(--p2-primary-dk)",
  green50: "var(--p2-hover)",
  hover: "var(--p2-hover)",
  /** Weiße Kartenfläche */
  surfaceCard: "var(--p2-surface-card)",
  /** Auswahl-Grün (gefüllt, weiße Schrift) */
  selected: "var(--p2-selected)",
  /** Sand — Sekundär-Akzent (Entscheidung / Badge) */
  sand: "var(--p2-sand)",
  sandText: "var(--p2-sand-text)",
  /** Skeleton-Fläche */
  skeleton: "var(--p2-hover)",
  danger: "var(--p2-danger)",
  dangerSoft: "var(--p2-danger-soft)",
  dangerBorder: "var(--p2-danger-border)",
  /** Karte Ruhe — D1: drei Schattenstufen (Rohwerte = Token-Definition) */
  shadowFlat: "inset 0 0 0 0.5px var(--p2-line)",
  shadowCard: "0 2px 10px rgba(16,32,24,0.05)",
  shadowFloat: "0 8px 24px rgba(16,32,24,0.1)",
  /** @deprecated Alias → shadowCard */
  shadow: "0 2px 10px rgba(16,32,24,0.05)",
  /** @deprecated Alias → shadowFloat */
  shadowHover: "0 8px 24px rgba(16,32,24,0.10)",
  shadowFocus: "0 8px 24px rgba(16,32,24,0.10)",
  shadowPrimaryBtn: "0 8px 24px rgba(16,32,24,0.10)",
  shadowNav: "0 8px 24px rgba(16,32,24,0.10)",
  shadowSheet: "0 8px 24px rgba(16,32,24,0.10)",
  /** Icon-Kachel klein */
  radiusSm: "12px",
  /** Listenkarte / Objektkarte / Hero-Streifen */
  radiusMd: "18px",
  /** Karte / Sektion / Modal */
  radiusLg: "22px",
  /** Mobil-Bottom-Sheet oben */
  radiusSheet: "28px",
  radiusPill: "999px",
  /** Abstandsskala D1 (sechs Stufen) */
  space1: "2px",
  space2: "4px",
  space3: "8px",
  space4: "12px",
  space5: "16px",
  space6: "24px",
  rowPad: "12px",
  rowGap: "8px",
  cardPad: "16px",
  stack: "12px",
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
  greenDark: "var(--org-primary-dk, var(--p2-primary-dk))",
  green50: "var(--org-primary-soft, var(--p2-primary-soft))",
  hover: "var(--p2-hover)",
  surfaceCard: "var(--p2-surface-card)",
  selected: "var(--p2-selected)",
  sand: "var(--p2-sand)",
  sandText: "var(--p2-sand-text)",
  skeleton: "var(--p2-skeleton)",
  danger: "var(--p2-danger)",
  dangerSoft: "var(--p2-danger-soft)",
  dangerBorder: "var(--p2-danger-border)",
  shadowFlat: "var(--p2-shadow-flat)",
  shadowCard: "var(--p2-shadow-card)",
  shadowFloat: "var(--p2-shadow-float)",
  shadow: "var(--p2-shadow-card)",
  shadowHover: "var(--p2-shadow-float)",
  shadowFocus: "var(--p2-shadow-float)",
  shadowPrimaryBtn: "var(--p2-shadow-float)",
  shadowNav: "var(--p2-shadow-float)",
  shadowSheet: "var(--p2-shadow-float)",
  radiusSm: "var(--p2-radius-sm)",
  radiusMd: "var(--p2-radius-md)",
  radiusLg: "var(--p2-radius-lg)",
  radiusSheet: "var(--p2-radius-sheet)",
  radiusPill: "var(--p2-radius-pill)",
  space1: "var(--p2-space-1)",
  space2: "var(--p2-space-2)",
  space3: "var(--p2-space-3)",
  space4: "var(--p2-space-4)",
  space5: "var(--p2-space-5)",
  space6: "var(--p2-space-6)",
  rowPad: "var(--p2-row-pad)",
  rowGap: "var(--p2-row-gap)",
  cardPad: "var(--p2-card-pad)",
  stack: "var(--p2-stack)",
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
  surfaceCard: "--p2-surface-card",
  selected: "--p2-selected",
  sand: "--p2-sand",
  sandText: "--p2-sand-text",
  skeleton: "--p2-skeleton",
  danger: "--p2-danger",
  dangerSoft: "--p2-danger-soft",
  dangerBorder: "--p2-danger-border",
  shadowFlat: "--p2-shadow-flat",
  shadowCard: "--p2-shadow-card",
  shadowFloat: "--p2-shadow-float",
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
  radiusPill: "--p2-radius-pill",
  space1: "--p2-space-1",
  space2: "--p2-space-2",
  space3: "--p2-space-3",
  space4: "--p2-space-4",
  space5: "--p2-space-5",
  space6: "--p2-space-6",
  rowPad: "--p2-row-pad",
  rowGap: "--p2-row-gap",
  cardPad: "--p2-card-pad",
  stack: "--p2-stack",
  scrim: "--p2-scrim",
  head: "--p2-font-head",
  body: "--p2-font-body",
  brandPrimary: "--org-primary",
  brandPrimaryDk: "--org-primary-dk",
  brandSoft: "--org-primary-soft",
} as const;
