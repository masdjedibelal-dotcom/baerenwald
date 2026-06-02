import { Suspense } from "react";

import { PartnerAuthShell } from "@/components/partner/PartnerAuthShell";
import { PartnerLoginForm } from "@/components/partner/PartnerLoginForm";

export const metadata = {
  title: "Partner-Anmeldung — Bärenwald",
  robots: { index: false, follow: false },
};

export default function PartnerLoginPage() {
  return (
    <PartnerAuthShell
      title="Anmelden"
      subtitle="Anfragen, Angebote und Aufträge von Bärenwald."
    >
      <Suspense fallback={<p className="text-center text-sm">Laden…</p>}>
        <PartnerLoginForm />
      </Suspense>
    </PartnerAuthShell>
  );
}
