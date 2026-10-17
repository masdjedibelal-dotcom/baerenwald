/**
 * Zentrale Betriebs-Konfiguration — Akzent entspricht Design-Token --acc.
 */
import { publicSiteOrigin } from "@/lib/staging";
import { MARKE } from "@/lib/marke";

const accentFromEnv =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_ACCENT_COLOR
    ? process.env.NEXT_PUBLIC_ACCENT_COLOR
    : "var(--p2-primary)";

const siteUrl = publicSiteOrigin();

export const SITE_CONFIG = {
  companyName: MARKE.name,
  logoInitials: MARKE.kurz,
  accentColor: accentFromEnv,
  /** Kanonische Site-URL für Schema & Open Graph */
  url: siteUrl,
  /** Social Preview — grüner Hintergrund (var(--p2-primary)), weißes Logo-Mark */
  ogImagePath: "/og-image.png",
  ogImageVersion: "20260602",
  /** Öffentliche Erreichbarkeit (UI, Header, Funnel, CTAs) — Festnetz */
  phone: "08980955726",
  phoneHref: "tel:+498980955726",
  /** Nur intern / Impressum & Pflichtangaben — nicht im allgemeinen UI */
  phoneMobil: "+49 163 7316161",
  phoneMobilHref: "tel:+491637316161",
  email: MARKE.firma.email,
  /** Geschäftsanschrift (Impressum, Schema, Kontakt). */
  addressStreet: MARKE.firma.strasse,
  addressHouseNumber: MARKE.firma.hausnummer,
  addressPostalCode: MARKE.firma.plz,
  addressCity: MARKE.firma.ort,
  addressLine: `${MARKE.firma.strasse} ${MARKE.firma.hausnummer}, ${MARKE.firma.plz} ${MARKE.firma.ort}`,
  region: "München & Umgebung",
  plzRadius: ["80", "81", "82", "83", "84", "85", "86"],
  calendlyUrl: "",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  /**
   * Einheitliche Zusage zur Rückmeldung auf Anfragen (Website + Mails).
   * Mo–Sa 24–48h; Sonntag ausgenommen (Rückmeldung am folgenden Werktag).
   */
  responseSlaWithin:
    "innerhalb von 24–48 Stunden (Mo–Sa; an Sonntagen am folgenden Werktag)",
} as const;

const ogImageAlt = `${MARKE.nameLang} — Partner aus einer Hand`;

/** Open Graph / Twitter — einheitlich für alle Seiten */
export const OG_IMAGE = {
  url: `${SITE_CONFIG.ogImagePath}?v=${SITE_CONFIG.ogImageVersion}`,
  width: 1200,
  height: 630,
  alt: ogImageAlt,
} as const;
