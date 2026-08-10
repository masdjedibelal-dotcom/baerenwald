import { AdminViewBanner } from "@/components/shared/AdminViewBanner";

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminViewBanner />
      {children}
    </>
  );
}
