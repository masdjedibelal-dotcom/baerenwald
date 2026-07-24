import { Suspense } from "react";

import { PortalAuthShell } from "@/components/portal/PortalAuthShell";
import { PortalSetPasswordForm } from "@/components/portal/PortalSetPasswordForm";

export const metadata = {
  title: "Neues Passwort — Partner-Portal",
  robots: { index: false, follow: false },
};

export default function PartnerPasswordNewPage() {
  return (
    <PortalAuthShell title="Neues Passwort festlegen">
      <Suspense
        fallback={
          <p className="portal-text-body text-center text-text-secondary">Wird geladen…</p>
        }
      >
        <PortalSetPasswordForm
          loginHref="/partner/login"
          forgotHref="/partner/passwort-vergessen"
        />
      </Suspense>
    </PortalAuthShell>
  );
}
