/**
 * Portal 2.0 TEIL G3 — Viewport (`getView` / `setView`).
 * Mock-iPhone-Rahmen (`mobileFrame`) NICHT übernehmen.
 * Real: Breakpoint — mobile < 1024px (Portal-Shell lg).
 */

export type PortalView = "mobile" | "desktop";

/** Mock-Äquivalent `getView()` aus Window-Breite. */
export const PORTAL_DESKTOP_MIN_PX = 1024;

export function resolvePortalView(
  widthPx: number,
  desktopMin = PORTAL_DESKTOP_MIN_PX
): PortalView {
  return widthPx >= desktopMin ? "desktop" : "mobile";
}

export function isPortalMobileView(view: PortalView): boolean {
  return view === "mobile";
}
