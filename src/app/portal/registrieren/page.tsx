import { PortalAuthShell } from "@/components/portal/PortalAuthShell";
import { PortalRegisterForm } from "@/components/portal/PortalRegisterForm";

export const metadata = {
  title: "Registrieren — MeinBärenwald",
  robots: { index: false, follow: false },
};

export default function PortalRegisterPage() {
  return (
    <PortalAuthShell
      title="Konto anlegen"
      subtitle="Nutze dieselbe E-Mail wie bei deiner Anfrage — wir verknüpfen deine Daten automatisch."
    >
      <PortalRegisterForm />
    </PortalAuthShell>
  );
}
