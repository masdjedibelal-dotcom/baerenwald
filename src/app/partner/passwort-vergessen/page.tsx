import { PartnerAuthShell } from "@/components/partner/PartnerAuthShell";
import { PartnerPasswordResetForm } from "@/components/partner/PartnerPasswordResetForm";

export const metadata = {
  title: "Passwort zurücksetzen — Partner",
  robots: { index: false, follow: false },
};

export default function PartnerPasswordForgotPage() {
  return (
    <PartnerAuthShell title="Passwort zurücksetzen">
      <PartnerPasswordResetForm />
    </PartnerAuthShell>
  );
}
