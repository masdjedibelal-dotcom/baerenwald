import type { RatgeberData } from "@/lib/ratgeber/types";

function collectStrings(value: unknown, out: string[]): void {
  if (value === null || value === undefined) return;
  if (typeof value === "string") {
    out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectStrings(v, out);
    return;
  }
  if (typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) {
      collectStrings(v, out);
    }
  }
}

/** Grobe Lesezeit (~200 Wörter/Minute), mindestens 4 Minuten. */
export function ratgeberReadingMinutes(data: RatgeberData): number {
  const parts: string[] = [];
  collectStrings(data, parts);
  const words = parts
    .join(" ")
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
  return Math.max(4, Math.round(words / 200));
}
