import { PortalAuthShell } from "@/components/portal/PortalAuthShell";
import { PortalPasswordResetForm } from "@/components/portal/PortalPasswordResetForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Passwort vergessen — MeinBärenwald",
  robots: { index: false, follow: false },
};

export default function PortalPasswordForgotPage() {
  return (
    <PortalAuthShell title="Passwort zurücksetzen">
      <PortalPasswordResetForm />
    </PortalAuthShell>
  );
}
