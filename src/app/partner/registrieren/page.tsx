import { PartnerAuthShell } from "@/components/partner/PartnerAuthShell";
import { PartnerRegisterForm } from "@/components/partner/PartnerRegisterForm";
import { PARTNER_AUTH_COPY } from "@/lib/partner/partner-auth-copy";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Partner-Registrierung — Bärenwald",
  robots: { index: false, follow: false },
};

export default function PartnerRegisterPage() {
  return (
    <PartnerAuthShell
      title="Registrieren"
      subtitle={PARTNER_AUTH_COPY.registerSubtitle}
    >
      <PartnerRegisterForm />
    </PartnerAuthShell>
  );
}
