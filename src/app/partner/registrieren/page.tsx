import { PartnerAuthShell } from "@/components/partner/PartnerAuthShell";
import { PartnerRegisterForm } from "@/components/partner/PartnerRegisterForm";

export const metadata = {
  title: "Partner-Registrierung — Bärenwald",
  robots: { index: false, follow: false },
};

export default function PartnerRegisterPage() {
  return (
    <PartnerAuthShell
      title="Registrieren"
      subtitle="Nur mit bei uns hinterlegter Partner-E-Mail."
    >
      <PartnerRegisterForm />
    </PartnerAuthShell>
  );
}
