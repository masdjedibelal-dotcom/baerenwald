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
    detail: "Handy-Kamera auf den QR – öffnet sich im Browser",
  },
  {
    n: "02",
    title: "Melden",
    detail: "Bereich wählen, Foto + kurze Beschreibung",
  },
  {
    n: "03",
    title: "Verfolgen",
    detail: "Nach Registrierung Status jederzeit in der App abrufbar",
  },
] as const;

export const AUSHANG_HERO_LINE1 = "Schaden melden.";
export const AUSHANG_HERO_LINE2 = "Einfach scannen.";
export const AUSHANG_HERO_BODY =
  "Defekte in Ihrer Wohnung oder im Gebäude online melden – mit Foto, ohne App, direkt im Browser. Sie erhalten eine Bestätigung und können den Status verfolgen.";
export const AUSHANG_PILL_HINT = "ohne App · direkt im Browser";
export const AUSHANG_OBJEKT_LABEL = "Für dieses Gebäude";
export const AUSHANG_FOOTER_NO_PHONE = "Kein Smartphone?";
export const AUSHANG_FOOTER_DATENSCHUTZ =
  "Datenschutz & Impressum: nach dem Scan im Formular";
export const AUSHANG_FOOTER_OPERATOR = "Bearbeitet durch";
export const AUSHANG_PROCESSED_BY = "Bärenwald Bau & Sanierung GmbH";
export const AUSHANG_BADGE = "Mieterportal";

/** PDF-Aushang im Browser (Drucken / Speichern über PDF-Viewer). */
export function meldeAushangPdfPath(objektId?: string): string {
  if (!objektId?.trim()) return "/api/org/melde-aushang";
  return `/api/org/melde-aushang?objektId=${encodeURIComponent(objektId.trim())}`;
}

/** @deprecated Alias — siehe meldeAushangPdfPath */
export function aushangPrintPath(objektId: string): string {
  return meldeAushangPdfPath(objektId);
}

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

/** @deprecated Alias — siehe meldeAushangPdfPath */
export function aushangPdfPath(objektId: string): string {
  return meldeAushangPdfPath(objektId);
}

