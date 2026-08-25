import type { Metadata } from "next";

import { AdminViewBanner } from "@/components/shared/AdminViewBanner";
import { PortalBusyProvider } from "@/components/shared/PortalBusyContext";
import { resolvePortalPwaApplicationName } from "@/lib/portal/resolve-portal-pwa-name";

export async function generateMetadata(): Promise<Metadata> {
  const applicationName = await resolvePortalPwaApplicationName();
  return {
    title: "Portal",
    manifest: "/manifest.webmanifest",
    applicationName,
    appleWebApp: {
      capable: true,
      title: applicationName,
      statusBarStyle: "default",
    },
    icons: {
      icon: [
        { url: "/icons/pwa-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/pwa-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [
        {
          url: "/icons/apple-touch-icon.png",
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
