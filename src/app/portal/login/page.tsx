import { Suspense } from "react";

import { PortalAuthShell } from "@/components/portal/PortalAuthShell";
import { PortalLoginForm } from "@/components/portal/PortalLoginForm";

export const metadata = {
  title: "Anmelden — MeinBärenwald",
  robots: { index: false, follow: false },
};

export default function PortalLoginPage() {
  return (
    <PortalAuthShell
      title="Anmelden"
      subtitle="Deine Anfragen, Angebote und Aufträge an einem Ort."
    >
      <Suspense
        fallback={
          <p className="text-center portal-text-body text-text-secondary">Laden…</p>
        }
      >
        <PortalLoginForm />
      </Suspense>
    </PortalAuthShell>
  );
}
