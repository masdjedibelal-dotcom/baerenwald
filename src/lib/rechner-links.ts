/** Klassischer Preisrechner (Website-Funnel). */
export const RECHNER_HREF = "/rechner";

/** Allgemeine Anfrage ohne Preisrechner (Anfrage-Weg im Rechner). */
export const ANFRAGE_HREF = "/rechner?modus=anfrage";

export function isKiBeratungModusParam(
  value: string | null | undefined
): boolean {
  return value?.trim().toLowerCase() === "ki";
}

/** modus=ki aus Hook oder window (falls SearchParams beim ersten Render leer sind). */
export function getKiModusFromSearch(
  searchParams: Pick<URLSearchParams, "get">
): string | null {
  const fromHook = searchParams.get("modus");
  if (fromHook) return fromHook;
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("modus");
}
