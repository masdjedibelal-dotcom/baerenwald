import { Suspense } from "react";

import { PortalAuthShell } from "@/components/portal/PortalAuthShell";
import { PortalSetPasswordForm } from "@/components/portal/PortalSetPasswordForm";
import { MARKE } from "@/lib/marke";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `Neues Passwort — ${MARKE.portalName}`,
  robots: { index: false, follow: false },
};

export default function PortalPasswordNewPage() {
  return (
    <PortalAuthShell title="Neues Passwort festlegen">
      <Suspense
        fallback={
          <p className="portal-text-body text-center text-text-secondary">Wird geladen…</p>
        }
      >
        <PortalSetPasswordForm />
      </Suspense>
    </PortalAuthShell>
  );
}
