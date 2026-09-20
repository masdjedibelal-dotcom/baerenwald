/** Gemeinsame Portal-Such-Typen (N1/N3). */

export type PortalSearchGroupId =
  | "vorgaenge"
  | "objekte"
  | "dokumente"
  | "navigation";

export const PORTAL_SEARCH_GROUP_LABELS: Record<PortalSearchGroupId, string> = {
  vorgaenge: "Vorgänge",
  objekte: "Objekte",
  dokumente: "Dokumente",
  navigation: "Navigation",
};

export type PortalSearchHit = {
  id: string;
  group: PortalSearchGroupId;
  icon: string;
  label: string;
  /** Meta-Zeile (Objekt · Status …) */
  sub?: string;
  /** Relativer Portal-Pfad inkl. Query */
  href: string;
};

export type PortalSearchResponse = {
  hits: PortalSearchHit[];
};

/** Escape für PostgREST `ilike` / `.or()`-Filter. */
export function portalSearchPattern(q: string): string {
  const safe = q.trim().replace(/[%_,]/g, " ").replace(/\s+/g, " ").trim();
  return `%${safe}%`;
}
