import type { Metadata } from "next";

import { AdminViewBanner } from "@/components/shared/AdminViewBanner";
import { PortalBusyProvider } from "@/components/shared/PortalBusyContext";
import { resolvePortalPwaApplicationName } from "@/lib/portal/resolve-portal-pwa-name";
import { MARKE_ASSETS } from "@/lib/marke-assets";

export async function generateMetadata(): Promise<Metadata> {
  const applicationName = await resolvePortalPwaApplicationName();
  return {
    title: "Portal",
    manifest: MARKE_ASSETS.manifestPortal,
    applicationName,
    appleWebApp: {
      capable: true,
      title: applicationName,
      statusBarStyle: "default",
    },
    icons: {
      icon: [
        { url: `${MARKE_ASSETS.iconDir}/pwa-192.png`, sizes: "192x192", type: "image/png" },
        { url: `${MARKE_ASSETS.iconDir}/pwa-512.png`, sizes: "512x512", type: "image/png" },
      ],
      apple: [
        {
          url: `${MARKE_ASSETS.iconDir}/apple-touch-icon.png`,
          sizes: "180x180",
          type: "image/png",
        },
      ],
    },
    other: {
      "mobile-web-app-capable": "yes",
    },
  };
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalBusyProvider>
      <AdminViewBanner />
      {children}
    </PortalBusyProvider>
  );
}
