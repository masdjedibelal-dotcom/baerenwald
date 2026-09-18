/**
 * Dekorative Portal-Medien (Hero / Objekt-Fallback).
 * Ein Bild, object-cover — passt Desktop (200px) und Mobile (150px).
 *
 * Defaults je Portal-Typ — nicht als „eigenes“ Upload-Bild zählen.
 */

export type PortalHeroKind =
  | "hv"
  | "mieter"
  | "privat"
  | "handwerker"
  | "eigentuemer"
  | "hausmeister";

/** Legacy / HV-Verwaltung (Innenhof). */
export const PORTAL_HEADER_HERO_SRC = "/images/portal/header-hero.jpg";

export const PORTAL_HEADER_HERO_BY_KIND: Record<PortalHeroKind, string> = {
  hv: PORTAL_HEADER_HERO_SRC,
  mieter: "/images/portal/header-hero-mieter.jpg",
  privat: "/images/portal/header-hero-privat.jpg",
  /** Eigentümer teilt Privatkunden-Hero (Eigenheim). */
  eigentuemer: "/images/portal/header-hero-privat.jpg",
  handwerker: "/images/portal/header-hero-handwerker.jpg",
  /** Hausmeister teilt Handwerker-Hero (Vor-Ort). */
  hausmeister: "/images/portal/header-hero-handwerker.jpg",
};

/** @deprecated Alias — bitte `portalHeaderHeroSrc(kind)` nutzen. */
export const PORTAL_HEADER_HERO_MIETER_SRC =
  PORTAL_HEADER_HERO_BY_KIND.mieter;
/** @deprecated Alias */
export const PORTAL_HEADER_HERO_PRIVAT_SRC =
  PORTAL_HEADER_HERO_BY_KIND.privat;
/** @deprecated Alias */
export const PORTAL_HEADER_HERO_HANDWERKER_SRC =
  PORTAL_HEADER_HERO_BY_KIND.handwerker;

/** Fallback wenn kein Gebäudefoto hochgeladen. */
export const PORTAL_OBJEKT_COVER_DEFAULT_SRC =
  "/images/portal/objekt-cover-default.jpg";

const DEFAULT_HERO_PATHS = new Set(
  Object.values(PORTAL_HEADER_HERO_BY_KIND)
);

export function portalHeaderHeroSrc(kind: PortalHeroKind = "hv"): string {
  return PORTAL_HEADER_HERO_BY_KIND[kind] ?? PORTAL_HEADER_HERO_SRC;
}

/** Statische Portal-Defaults — gelten nicht als „eigenes“ Bild. */
export function isPortalDefaultMediaUrl(url: string | null | undefined): boolean {
  if (!url) return true;
  const u = url.trim();
  if (!u) return true;
  if (DEFAULT_HERO_PATHS.has(u) || u === PORTAL_OBJEKT_COVER_DEFAULT_SRC) {
    return true;
  }
  return (
    u.endsWith("/images/portal/header-hero.jpg") ||
    u.endsWith("/images/portal/header-hero-mieter.jpg") ||
    u.endsWith("/images/portal/header-hero-privat.jpg") ||
    u.endsWith("/images/portal/header-hero-handwerker.jpg") ||
    u.endsWith("/images/portal/objekt-cover-default.jpg")
  );
}

export function resolvePortalHeroSrc(
  orgHeroUrl?: string | null,
  kind: PortalHeroKind = "hv"
): string {
  const custom = orgHeroUrl?.trim();
  if (custom && !isPortalDefaultMediaUrl(custom)) return custom;
  return portalHeaderHeroSrc(kind);
}

export function resolveObjektCoverSrc(
  coverUrl?: string | null
): string {
  const custom = coverUrl?.trim();
  if (custom && !isPortalDefaultMediaUrl(custom)) return custom;
  return PORTAL_OBJEKT_COVER_DEFAULT_SRC;
}
