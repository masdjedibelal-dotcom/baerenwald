/**
 * Dekorative Portal-Medien (Hero / Objekt-Fallback).
 * Ein Bild, object-cover — passt Desktop (200px) und Mobile (150px).
 */
export const PORTAL_HEADER_HERO_SRC = "/images/portal/header-hero.jpg";

/** Fallback wenn kein Gebäudefoto hochgeladen. */
export const PORTAL_OBJEKT_COVER_DEFAULT_SRC =
  "/images/portal/objekt-cover-default.jpg";

/** Statische Portal-Defaults — gelten nicht als „eigenes“ Bild. */
export function isPortalDefaultMediaUrl(url: string | null | undefined): boolean {
  if (!url) return true;
  const u = url.trim();
  if (!u) return true;
  return (
    u === PORTAL_HEADER_HERO_SRC ||
    u === PORTAL_OBJEKT_COVER_DEFAULT_SRC ||
    u.endsWith("/images/portal/header-hero.jpg") ||
    u.endsWith("/images/portal/objekt-cover-default.jpg")
  );
}

export function resolvePortalHeroSrc(
  orgHeroUrl?: string | null
): string {
  const custom = orgHeroUrl?.trim();
  if (custom && !isPortalDefaultMediaUrl(custom)) return custom;
  return PORTAL_HEADER_HERO_SRC;
}

export function resolveObjektCoverSrc(
  coverUrl?: string | null
): string {
  const custom = coverUrl?.trim();
  if (custom && !isPortalDefaultMediaUrl(custom)) return custom;
  return PORTAL_OBJEKT_COVER_DEFAULT_SRC;
}
