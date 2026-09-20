/**
 * N5/C: Zurück zur Herkunftsliste über `return`-Parameter.
 * Fallback: Default-Liste der Section — nie Dashboard-Übersicht ohne section.
 */

const ALLOWED_LIST_PREFIXES = ["/portal", "/partner"] as const;

export function buildListReturnUrl(
  listPathWithQuery: string,
  detailPath: string
): string {
  const base = detailPath.split("?")[0] ?? detailPath;
  const detailQs = detailPath.includes("?")
    ? detailPath.slice(detailPath.indexOf("?") + 1)
    : "";
  const ret = listPathWithQuery.startsWith("/")
    ? listPathWithQuery
    : `/${listPathWithQuery}`;
  const params = new URLSearchParams(detailQs);
  params.set("return", ret);
  return `${base}?${params.toString()}`;
}

/** Liest `return` aus SearchParams oder Query-String. */
export function parseReturn(
  searchParams: URLSearchParams | { get(name: string): string | null },
  fallbackListHref: string
): string {
  const raw = searchParams.get("return")?.trim();
  if (!raw) return sanitizeListHref(fallbackListHref);
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    /* keep raw */
  }
  return sanitizeListHref(decoded, fallbackListHref);
}

function sanitizeListHref(href: string, fallback = "/portal?section=vorgaenge"): string {
  const h = href.trim();
  if (!h.startsWith("/") || h.startsWith("//")) return fallback;
  if (h === "/" || h.startsWith("/?")) return fallback;
  const pathOnly = h.split("?")[0] ?? h;
  const ok = ALLOWED_LIST_PREFIXES.some(
    (p) => pathOnly === p || pathOnly.startsWith(`${p}/`)
  );
  if (!ok) return fallback;
  return h;
}

/** Default-Liste je Portal-Basis (nie reines Dashboard). */
export function defaultListHrefForDetail(pathname: string): string {
  if (pathname.startsWith("/partner")) {
    return "/partner?section=vorgaenge";
  }
  return "/portal?section=vorgaenge";
}
