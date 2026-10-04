

/** Storage-Pfade aus `hw_angebot_anhang_urls` (jsonb) inkl. Fallback auf Primär-PDF. */
export function parseHwAnhangStoragePaths(
  raw: unknown,
  fallbackPath: string | null | undefined
): string[] {
  if (Array.isArray(raw)) {
    const paths = raw.map((x) => String(x).trim()).filter(Boolean);
    if (paths.length) return paths;
  }
  const fb = fallbackPath?.trim();
  return fb ? [fb] : [];
}
