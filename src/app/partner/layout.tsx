import type { Metadata } from "next";
import { AdminViewBanner } from "@/components/shared/AdminViewBanner";
import { PortalBusyProvider } from "@/components/shared/PortalBusyContext";

export const metadata: Metadata = {
  title: "Partner",
  manifest: "/manifest-partner.webmanifest",
  applicationName: "BW Partner",
  appleWebApp: {
    capable: true,
    title: "BW Partner",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/pwa-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/pwa-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
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
