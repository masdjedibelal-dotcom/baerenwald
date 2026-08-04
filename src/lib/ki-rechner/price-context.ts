import { PREISE } from "@/lib/funnel/price-calc";

type BasisEintrag = {
  min: number;
  max: number;
  einheit: string;
  groesseVon?: number;
  groesseBis?: number;
};

function formatEur(n: number): string {
  return Math.round(n).toLocaleString("de-DE");
}

function flattenPreise(
  obj: Record<string, unknown>,
  prefix: string
): string[] {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && "min" in (v as object)) {
      const e = v as BasisEintrag;
      let size = "";
      if (e.groesseVon != null || e.groesseBis != null) {
        const bis =
          e.groesseBis != null && e.groesseBis >= 999 ? "∞" : String(e.groesseBis);
        size = ` [${e.groesseVon ?? 0}–${bis} m² Badfläche]`;
      }
      lines.push(
        `${p}: ${formatEur(e.min)}–${formatEur(e.max)} € ${e.einheit}${size}`
      );
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      lines.push(...flattenPreise(v as Record<string, unknown>, p));
    }
  }
  return lines.sort();
}

/** Kompakte Preistabelle aus dem echten Bärenwald-Rechner (PREISE). */
export function buildKiPriceContext(): string {
  return flattenPreise(PREISE as unknown as Record<string, unknown>, "").join(
    "\n"
  );
}
