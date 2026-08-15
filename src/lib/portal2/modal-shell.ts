/**
 * Portal 2.0 — Overlay-Shell (SoT: PORTAL-SURFACE-OPTIMIERUNG.md).
 *
 * Leitregel:
 * - edit / preview → mobil Bottom Sheet, Desktop Side-Over
 * - confirm → mobil kurzes Sheet, Desktop kompaktes Center
 * - funnel → mobil Fullscreen, Desktop großes Center-Modal
 */

/** Surface-Variante der Shell. */
export type PortalModalVariant = "edit" | "confirm" | "funnel" | "preview";

/** @deprecated Nutze `variant`. `default` → edit, `funnel` → funnel. */
export type PortalModalSizeLegacy = "default" | "funnel";

/** Default `maxW` laut Mock (edit). */
export const PORTAL_MODAL_DEFAULT_MAX_W = 460;

/** Preview Side-Over / Sheet etwas breiter. */
export const PORTAL_MODAL_PREVIEW_MAX_W = 640;

/** Funnel Desktop-Breite. */
export const PORTAL_MODAL_FUNNEL_MAX_W = 1360;

/** Confirm kompakt. */
export const PORTAL_MODAL_CONFIRM_MAX_W = 420;

/**
 * Overlay z-index (unter docViewer 220).
 * Nesting: PortalModalShell addiert +10 pro Ebene (KI im Sheet → 210).
 * GPT-Overlay liegt bei 210 — über WhatsApp-Float (150) und Bottom-Nav (50).
 */
export const PORTAL_MODAL_Z_INDEX = 200;

/** Scrim hinter Modal / Slide-over — klarer Kontrast zur Seite. */
export const PORTAL_MODAL_SCRIM = "rgba(16,25,20,.52)";

export function resolvePortalModalVariant(
  variant: PortalModalVariant | undefined,
  size: PortalModalSizeLegacy | undefined
): PortalModalVariant {
  if (variant) return variant;
  if (size === "funnel") return "funnel";
  return "edit";
}

export function resolvePortalModalMaxWidth(
  variant: PortalModalVariant,
  maxWidth: number | string | undefined
): number | string {
  if (maxWidth !== undefined) return maxWidth;
  switch (variant) {
    case "funnel":
      return PORTAL_MODAL_FUNNEL_MAX_W;
    case "preview":
      return PORTAL_MODAL_PREVIEW_MAX_W;
    case "confirm":
      return PORTAL_MODAL_CONFIRM_MAX_W;
    case "edit":
    default:
      return PORTAL_MODAL_DEFAULT_MAX_W;
  }
}
