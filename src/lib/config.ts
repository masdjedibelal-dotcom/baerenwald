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
    : "https://www.baerenwald.de";

export const SITE_CONFIG = {
  companyName: "Bärenwald",
  logoInitials: "BW",
  accentColor: accentFromEnv,
  /** Kanonische Site-URL für Schema & Open Graph */
  url: siteUrl,
  /** Öffentliche Erreichbarkeit (UI, Header, Funnel, CTAs) — Festnetz */
  phone: "089 99733904",
  phoneHref: "tel:+498999733904",
  /** Nur intern / Impressum & Pflichtangaben — nicht im allgemeinen UI */
  phoneMobil: "+49 163 7316161",
  phoneMobilHref: "tel:+491637316161",
  email: "info@baerenwald-muenchen.de",
  region: "München & Umgebung",
  plzRadius: ["80", "81", "82", "83", "85"],
  calendlyUrl: "",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
} as const;
