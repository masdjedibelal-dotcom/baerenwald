import type { Metadata } from "next";
import { AdminViewBanner } from "@/components/shared/AdminViewBanner";
import { PortalBusyProvider } from "@/components/shared/PortalBusyContext";

export const metadata: Metadata = {
  title: "Portal",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Bärenwald",
    statusBarStyle: "default",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalBusyProvider>
      <AdminViewBanner />
      {children}
    </PortalBusyProvider>
  );
}
