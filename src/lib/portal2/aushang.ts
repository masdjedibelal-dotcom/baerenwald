/**
 * Portal 2.0 B10 / E3 — Aushang-Slug, URL, Poster-Texte.
 * QR: Live = scannbar auf meldeUrl (Spec E3); Mock qrMatrix nur Referenz.
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

/** Live-Melde-URL (nicht Mock-Domain melden.hv…). */
export function aushangUrl(
  orgKennung: string,
  objekt: Parameters<typeof aushangSlug>[0]
): string {
  const slug = aushangSlug(objekt);
  return buildMeldeUrl(orgKennung.trim().toLowerCase(), slug);
}

export const AUSHANG_STEPS = [
  {
    n: "01",
    title: "Scannen",
    detail: "Handy-Kamera auf den Code halten",
  },
  {
    n: "02",
    title: "Anliegen melden",
    detail: "Schaden beschreiben – ein Foto genügt",
  },
  {
    n: "03",
    title: "Informiert bleiben",
    detail: "Status live verfolgen, ganz ohne Anruf",
  },
] as const;

export const AUSHANG_MODAL_TITLE = "Aushang für den Hausflur";
export const AUSHANG_MODAL_SUB =
  "Ausdrucken (A4) und im Eingang aufhängen";
export const AUSHANG_PRINT_LABEL = "🖨  Drucken (A4)";
export const AUSHANG_HERO_EYEBROW = "Ihr digitaler Draht zur Hausverwaltung";
export const AUSHANG_HERO_LINE1 = "Ihr Mieterportal.";
export const AUSHANG_HERO_LINE2 = "Einfach scannen.";
export const AUSHANG_HERO_BODY =
  "Schäden melden, Status verfolgen, Termine & Kontakte im Blick – alles rund um Ihre Wohnung, digital in unter einer Minute. Kein Papier, keine Telefonschleife.";
export const AUSHANG_PILL_HINT = "ohne App · direkt im Browser";
export const AUSHANG_OBJEKT_LABEL = "Für dieses Gebäude";
export const AUSHANG_FOOTER_NO_PHONE = "Kein Smartphone?";
export const AUSHANG_POWERED = "Portal bereitgestellt mit";
export const AUSHANG_POWERED_BRAND = "Bärenwald";
export const AUSHANG_BADGE = "Mieterportal";

export type AushangBrand = {
  name: string;
  sub?: string | null;
  logoKuerzel?: string | null;
  primary: string;
  primaryDk?: string | null;
  soft?: string | null;
  telefon?: string | null;
  email?: string | null;
};

export type AushangObjektView = {
  id: string;
  titel: string;
  adresse: string;
  melde_slug?: string | null;
};

/** Mock-Meta `omelette-owns-print: aushang` — Print-Ansicht markieren. */
export const AUSHANG_PRINT_META_NAME = "omelette-owns-print" as const;
export const AUSHANG_PRINT_META_CONTENT = "aushang" as const;

/** Eigene Print-Route (E3). */
export function aushangPrintPath(objektId: string): string {
  return `/portal/aushang/${encodeURIComponent(objektId)}`;
}
