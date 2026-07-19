import { resolveHandwerkerAnsprechpartner } from "@/lib/partner/handwerker-ansprechpartner";
import type {
  HandwerkerDisplay,
  HandwerkerDisplaySource,
} from "@/lib/portal2/basisdaten-types";

/** Gewerke wie Mock `trade`: „Sanitär · Heizung“. */
export function formatHandwerkerTrade(
  gewerkNamen?: string[] | null,
  gewerkeSlugs?: string[] | null
): string {
  const names = (gewerkNamen ?? [])
    .map((n) => n.trim())
    .filter(Boolean);
  if (names.length > 0) return names.join(" · ");
  const slugs = (gewerkeSlugs ?? [])
    .map((s) => s.trim())
    .filter(Boolean);
  return slugs.join(" · ");
}

/**
 * Rating nur bei echten Stammdaten:
 * `bewertung_anzahl >= 1` und `bewertung_gesamt != null`.
 * Sonst `undefined` — UI lässt das Feld weg (kein Fake).
 */
export function resolveHandwerkerRating(src: {
  bewertung_gesamt?: number | null;
  bewertung_anzahl?: number | null;
}): number | undefined {
  const anzahl = src.bewertung_anzahl ?? 0;
  const gesamt = src.bewertung_gesamt;
  if (anzahl >= 1 && typeof gesamt === "number" && Number.isFinite(gesamt)) {
    return gesamt;
  }
  return undefined;
}

/** Handwerker-Stamm → Mock-HANDWERKER-Anzeigeform. */
export function toHandwerkerDisplay(
  src: HandwerkerDisplaySource
): HandwerkerDisplay {
  const person = resolveHandwerkerAnsprechpartner({
    vorname: src.vorname,
    nachname: src.nachname,
    name: src.name,
  });
  const firma = src.firma?.trim() || "";
  const name = firma || person.vollname || (src.name?.trim() ?? "") || "Handwerker";
  const trade = formatHandwerkerTrade(src.gewerkNamen, src.gewerke);
  const rating = resolveHandwerkerRating(src);

  const out: HandwerkerDisplay = {
    id: src.id,
    name,
    trade,
  };
  if (rating !== undefined) {
    out.rating = rating;
  }
  return out;
}

export function toHandwerkerDisplayList(
  rows: HandwerkerDisplaySource[]
): HandwerkerDisplay[] {
  return rows.map(toHandwerkerDisplay);
}
