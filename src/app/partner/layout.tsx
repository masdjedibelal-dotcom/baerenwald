import type { Metadata } from "next";
import { AdminViewBanner } from "@/components/shared/AdminViewBanner";
import { PortalBusyProvider } from "@/components/shared/PortalBusyContext";
import { istTeo } from "@/lib/marke";
import { MARKE_ASSETS } from "@/lib/marke-assets";

export const metadata: Metadata = {
  title: "Partner",
  manifest: MARKE_ASSETS.manifestPartner,
  applicationName: "BW Partner",
  appleWebApp: {
    capable: true,
    title: istTeo ? "TEO Partner" : "BW Partner",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: `${MARKE_ASSETS.iconDir}/pwa-192.png`, sizes: "192x192", type: "image/png" },
      { url: `${MARKE_ASSETS.iconDir}/pwa-512.png`, sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: `${MARKE_ASSETS.iconDir}/apple-touch-icon.png`, sizes: "180x180", type: "image/png" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalBusyProvider>
      <AdminViewBanner />
      {children}
    </PortalBusyProvider>
  );
}
