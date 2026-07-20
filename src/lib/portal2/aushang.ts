/**
 * Portal 2.0 — Aushang-Texte & Typen (PDF-Aushang Schadensmeldung).
 * Layout: Konzept „Details vereinheitlichen“.
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
    detail:
      "Handy-Kamera auf den QR-Code halten — die Meldeseite öffnet sich sofort.",
  },
  {
    n: "02",
    title: "Melden",
    detail:
      "Bereich wählen, Foto aufnehmen, Schaden kurz beschreiben — fertig.",
  },
  {
    n: "03",
    title: "Verfolgen",
    detail:
      "Sie bekommen eine Bestätigung und sehen den Status jederzeit.",
  },
] as const;

export const AUSHANG_HERO_LINE1 = "Schaden melden,";
export const AUSHANG_HERO_LINE2 = "einfach scannen.";
export const AUSHANG_HERO_BODY =
  "Ein Defekt in Ihrer Wohnung oder im Haus? Melden Sie ihn online — mit Foto, ohne App, in unter 2 Minuten. Sie bekommen sofort eine Bestätigung und sehen jederzeit, wie es weitergeht.";

export const AUSHANG_BADGE = "MIETERSERVICE";
export const AUSHANG_SCAN_LABEL = "MIT DER HANDY-KAMERA SCANNEN";
export const AUSHANG_STEPS_TITLE = "SO FUNKTIONIERT'S";
export const AUSHANG_PHOTO_HINT =
  "Foto einfügen (Gebäude, Team oder Handwerker)";
export const AUSHANG_TAGLINE = "IHR ZUHAUSE IN GUTEN HÄNDEN";
export const AUSHANG_FOOTER_NO_PHONE = "KEIN SMARTPHONE?";
export const AUSHANG_FOOTER_CONTACT = "Wenden Sie sich an Ihre Hausverwaltung";
export const AUSHANG_FOOTER_DATENSCHUTZ =
  "Datenschutz & Impressum: nach dem Scan im Formular";

/** @deprecated — Konzept ohne separaten Objekt-Kasten */
export const AUSHANG_OBJEKT_LABEL = "Für dieses Gebäude";
/** @deprecated */
export const AUSHANG_PILL_HINT = "ohne App · direkt im Browser";
/** @deprecated */
export const AUSHANG_FOOTER_OPERATOR = "Bearbeitet durch";
/** @deprecated */
export const AUSHANG_PROCESSED_BY = "Bärenwald Bau & Sanierung GmbH";

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
