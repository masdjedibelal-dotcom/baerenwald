/**
 * Portal Breakpoint-SoT (P8-01).
 * Ein Cutoff: darunter App-Chrome (Bottom-Nav), darüber Desktop-Portal.
 * Shell, Funnel und Overlays nutzen `lg` = 1024px.
 */
export const PORTAL_BREAKPOINT_LG_PX = 1024;

/** Media-Query für Desktop-Portal (≥ lg). */
export const PORTAL_MQ_DESKTOP = `(min-width: ${PORTAL_BREAKPOINT_LG_PX}px)`;

/** Media-Query für Mobile-App-Chrome (< lg). */
export const PORTAL_MQ_MOBILE = `(max-width: ${PORTAL_BREAKPOINT_LG_PX - 1}px)`;
