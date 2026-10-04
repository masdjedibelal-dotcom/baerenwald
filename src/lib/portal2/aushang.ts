/**
 * Portal 2.0 — Aushang-Texte & Typen (PDF-Aushang Schadensmeldung).
 */

import { buildMeldeUrl } from "@/lib/org/melde-url";
import { normalizeOrgSlug } from "@/lib/org/slug";

/** Mock `aushangSlug(o)` — Live bevorzugt `melde_slug`. */
export function aushangSlug(input: {
  melde_slug?: string | null;
  slug?: string | null;
  name?: string | null;
  titel?: string | null;
}): string {
  const preferred =
    input.melde_slug?.trim() ||
    input.slug?.trim() ||
    input.name?.trim() ||
    input.titel?.trim() ||
    "objekt";
  return normalizeOrgSlug(preferred) || "objekt";
}

/** Live-Melde-URL (nicht Mock-Domain melden.hv…). Print/QR: kanonische Domain. */
export function aushangUrl(
  orgKennung: string,
  objekt: Parameters<typeof aushangSlug>[0],
  opts?: { forPrint?: boolean }
): string {
  const slug = aushangSlug(objekt);
  return buildMeldeUrl(orgKennung.trim().toLowerCase(), slug, opts);
}

export const AUSHANG_STEPS = [
  {
    n: "01",
    title: "Digital",
    detail:
      "Kein Warten am Telefon — melden Sie den Schaden online, wann es Ihnen passt.",
  },
  {
    n: "02",
    title: "Einfach",
    detail:
      "QR scannen, Foto dazu, kurz beschreiben. Fertig in wenigen Minuten — ohne App.",
  },
  {
    n: "03",
    title: "Transparent",
    detail:
      "Sofort eine Bestätigung — und Sie sehen jederzeit, was mit Ihrer Meldung passiert.",
  },
] as const;

export const AUSHANG_HERO_LINE1 = "Schaden melden,";
export const AUSHANG_HERO_LINE2 = "Status im Blick.";
export const AUSHANG_HERO_BODY =
  "Kein Warten am Telefon. Melden Sie den Defekt digital — mit Foto, in wenigen Minuten. Sofort eine Bestätigung, und Sie behalten den Stand jederzeit im Blick.";
export const AUSHANG_SCAN_LABEL = "Jetzt melden";
export const AUSHANG_STEPS_TITLE = "Ihre Vorteile";
/** Hinweis White-Label: klein im Fuß, nie an Mieter-Mails. */
export const AUSHANG_FOOTER_PARTNER = "Ein Service von Bärenwald";

/** PDF-Aushang im Browser (Drucken / Speichern über PDF-Viewer). */
export function meldeAushangPdfPath(objektId?: string): string {
  if (!objektId?.trim()) return "/api/org/melde-aushang";
  return `/api/org/melde-aushang?objektId=${encodeURIComponent(objektId.trim())}`;
}

/** QR-PNG für Melde-Link (Modal / Download). */
export function meldeQrPngPath(objektId?: string): string {
  if (!objektId?.trim()) return "/api/org/melde-qr";
  return `/api/org/melde-qr?objektId=${encodeURIComponent(objektId.trim())}`;
}
