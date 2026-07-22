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

/** @deprecated — nicht mehr auf dem Aushang */
export const AUSHANG_BADGE = "MIETERSERVICE";
export const AUSHANG_SCAN_LABEL = "Jetzt melden";
export const AUSHANG_STEPS_TITLE = "Ihre Vorteile";
/** @deprecated — Chips nicht mehr auf dem Aushang */
export const AUSHANG_TRUST_CHIPS = [
  "Ohne Warteschleife",
  "Mit Foto",
  "Status live",
] as const;
export const AUSHANG_PHOTO_HINT =
  "Foto einfügen (Gebäude oder Objekt)";
/** @deprecated — nicht mehr auf dem Aushang */
export const AUSHANG_TAGLINE = "IHR ZUHAUSE IN GUTEN HÄNDEN";
export const AUSHANG_FOOTER_NO_PHONE = "LIEBER TELEFONISCH?";
export const AUSHANG_FOOTER_CONTACT = "Wir sind erreichbar unter";
/** Hinweis: Aushang im Namen der HV, Abwicklung über Partner. */
export const AUSHANG_FOOTER_PARTNER =
  "Ihre Meldung läuft über unseren Partner Bärenwald.";
export const AUSHANG_FOOTER_DATENSCHUTZ =
  "Datenschutz & Impressum: nach dem Scan im Formular";

/** @deprecated — Konzept ohne separaten Objekt-Kasten */
export const AUSHANG_OBJEKT_LABEL = "Für dieses Gebäude";
/** @deprecated */
export const AUSHANG_PILL_HINT = "ohne App · direkt im Browser";
/** @deprecated — siehe AUSHANG_FOOTER_PARTNER */
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
