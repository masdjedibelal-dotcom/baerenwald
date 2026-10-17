import { istTeo } from "@/lib/marke";

/** Website/Portal: Logo- und Icon-Pfade je Marke (TEO-Dateien unter /public/brand/teo/). */
export const MARKE_ASSETS = {
  logoGruen: istTeo ? "/brand/teo/logo-mark-green.png" : "/logo-mark-green.png",
  logoWeiss: istTeo ? "/brand/teo/logo-mark-white.png" : "/logo-mark-white.png",
  iconDir: istTeo ? "/brand/teo" : "/icons",
  manifestPortal: istTeo ? "/brand/teo/manifest.webmanifest" : "/manifest.webmanifest",
  manifestPartner: istTeo ? "/brand/teo/manifest-partner.webmanifest" : "/manifest-partner.webmanifest",
} as const;
