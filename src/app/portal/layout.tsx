import { AdminViewBanner } from "@/components/shared/AdminViewBanner";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminViewBanner />
      {children}
    </>
  );
}
