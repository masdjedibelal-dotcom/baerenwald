import { AdminViewBanner } from "@/components/shared/AdminViewBanner";
import { PortalBusyProvider } from "@/components/shared/PortalBusyContext";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalBusyProvider>
      <AdminViewBanner />
      {children}
    </PortalBusyProvider>
  );
}
