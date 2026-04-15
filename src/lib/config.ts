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
  phone: "+49 163 7316161",
  phoneHref: "tel:+491637316161",
  phoneFestnetz: "089 99733904",
  phoneFestnetHref: "tel:+498999733904",
  email: "info@baerenwald-muenchen.de",
  region: "München & Umgebung",
  plzRadius: ["80", "81", "82", "83", "85"],
  calendlyUrl: "",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
} as const;
