/**
 * Zentrale Betriebs-Konfiguration — Akzent entspricht Design-Token --acc.
 */
const accentFromEnv =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_ACCENT_COLOR
    ? process.env.NEXT_PUBLIC_ACCENT_COLOR
    : "#2E7D52";

const siteUrl =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_SITE_URL
    ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")
    : "https://baerenwaldmuenchen.de";

export const SITE_CONFIG = {
  companyName: "Bärenwald",
  logoInitials: "BW",
  accentColor: accentFromEnv,
  /** Kanonische Site-URL für Schema & Open Graph */
  url: siteUrl,
  /** Social Preview — grüner Hintergrund (#2E7D52), weißes Logo-Mark */
  ogImagePath: "/og-image.png",
  ogImageVersion: "20260602",
  /** Öffentliche Erreichbarkeit (UI, Header, Funnel, CTAs) — Festnetz */
  phone: "08980955726",
  phoneHref: "tel:+498980955726",
  /** Nur intern / Impressum & Pflichtangaben — nicht im allgemeinen UI */
  phoneMobil: "+49 163 7316161",
  phoneMobilHref: "tel:+491637316161",
  email: "info@baerenwaldmuenchen.de",
  /** Geschäftsanschrift (Impressum, Schema, Kontakt). */
  addressStreet: "Bärenwaldstraße",
  addressHouseNumber: "20",
  addressPostalCode: "81737",
  addressCity: "München",
  addressLine: "Bärenwaldstraße 20, 81737 München",
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

const ogImageAlt = "Bärenwald München — Handwerker aus einer Hand";

/** Open Graph / Twitter — einheitlich für alle Seiten */
export const OG_IMAGE = {
  url: `${SITE_CONFIG.ogImagePath}?v=${SITE_CONFIG.ogImageVersion}`,
  width: 1200,
  height: 630,
  alt: ogImageAlt,
} as const;
