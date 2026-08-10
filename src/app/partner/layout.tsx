import { AdminViewBanner } from "@/components/shared/AdminViewBanner";
import { PortalBusyProvider } from "@/components/shared/PortalBusyContext";

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalBusyProvider>
      <AdminViewBanner />
      {children}
    </PortalBusyProvider>
  );
}
