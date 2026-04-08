/**
 * Zentrale Betriebs-Konfiguration — Akzent entspricht Design-Token --acc.
 */
export const SITE_CONFIG = {
  companyName: "Bärenwald Handwerksgruppe",
  logoInitials: "BW",
  accentColor: "#1B4332",
  phone: "+49 89 12345678",
  email: "info@baerenwald.de",
  region: "München & Umgebung",
  plzRadius: ["80", "81", "82", "83", "85"],
  calendlyUrl: "",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
} as const;
