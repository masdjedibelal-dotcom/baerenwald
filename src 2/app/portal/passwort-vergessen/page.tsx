import { PortalAuthShell } from "@/components/portal/PortalAuthShell";
import { PortalPasswordResetForm } from "@/components/portal/PortalPasswordResetForm";
import { AUTH_FORGOT } from "@/lib/portal2/auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Passwort vergessen — MeinBärenwald",
  robots: { index: false, follow: false },
};

export default function PortalPasswordForgotPage() {
  return (
    <PortalAuthShell title={AUTH_FORGOT.title} subtitle={AUTH_FORGOT.subtitle}>
      <PortalPasswordResetForm />
    </PortalAuthShell>
  );
}
