import { Suspense } from "react";

import { PortalAuthShell } from "@/components/portal/PortalAuthShell";
import { PortalLoginForm } from "@/components/portal/PortalLoginForm";
import { AUTH_LOGIN,authBrandName } from "@/lib/portal2/auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Anmelden — MeinBärenwald",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function PortalLoginPage({ searchParams }: Props) {
  void searchParams;
  const role = "kunde" as const;
  const brand = authBrandName(role);
  const wl = false;

  return (
    <PortalAuthShell
      title={AUTH_LOGIN.title}
      subtitle={AUTH_LOGIN.subtitle(brand)}
      brand={wl ? "whitelabel" : "kunde"}
      authRole={role}
      orgName={wl ? brand : undefined}
    >
      <Suspense
        fallback={
          <p className="text-center text-sm text-text-secondary">Laden…</p>
        }
      >
        <PortalLoginForm role={role} orgName={wl ? brand : undefined} />
      </Suspense>
    </PortalAuthShell>
  );
}
