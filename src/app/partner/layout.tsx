import type { Metadata } from "next";
import { AdminViewBanner } from "@/components/shared/AdminViewBanner";
import { PortalBusyProvider } from "@/components/shared/PortalBusyContext";

export const metadata: Metadata = {
  title: "Partner",
  manifest: "/manifest-partner.webmanifest",
  appleWebApp: {
    capable: true,
    title: "BW Partner",
    statusBarStyle: "default",
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
