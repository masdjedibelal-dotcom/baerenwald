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
  companyName: "Bärenwald Handwerksgruppe",
  logoInitials: "BW",
  accentColor: accentFromEnv,
  /** Kanonische Site-URL für Schema & Open Graph */
  url: siteUrl,
  phone: "+49 89 12345678",
  email: "info@baerenwald.de",
  region: "München & Umgebung",
  plzRadius: ["80", "81", "82", "83", "85"],
  calendlyUrl: "",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
} as const;
