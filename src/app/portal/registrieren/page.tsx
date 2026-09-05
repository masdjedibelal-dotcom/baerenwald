import { Suspense } from "react";

import { PortalAuthShell } from "@/components/portal/PortalAuthShell";
import { PortalRegisterForm } from "@/components/portal/PortalRegisterForm";
import { loadMeldeContactByToken } from "@/lib/melde/melde-bestaetigung";

export const metadata = {
  title: "Registrieren — MeinBärenwald",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function first(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0]?.trim() ?? "";
  return typeof v === "string" ? v.trim() : "";
}

export default async function PortalRegisterPage({ searchParams }: Props) {
  const fromMelde = first(searchParams?.from) === "melde";
  const meldeToken = first(searchParams?.meldeToken);
  const locked =
    first(searchParams?.locked) === "1" || fromMelde || Boolean(meldeToken);

  const fromDb = meldeToken
    ? await loadMeldeContactByToken(meldeToken)
    : null;

  const prefill = {
    name: fromDb?.name || first(searchParams?.name) || undefined,
    email: fromDb?.email || first(searchParams?.email) || undefined,
    telefon: fromDb?.telefon || first(searchParams?.telefon) || undefined,
    locked,
  };

  const subtitle = locked
    ? "Angaben aus Ihrer Schadenmeldung — bitte Passwort vergeben und zustimmen."
    : "Nutze dieselbe E-Mail wie bei deiner Anfrage — wir verknüpfen deine Daten automatisch.";

  return (
    <PortalAuthShell title="Konto anlegen" subtitle={subtitle}>
      <Suspense
        fallback={
          <p className="text-center text-sm text-text-secondary">Laden…</p>
        }
      >
        <PortalRegisterForm prefill={prefill} />
      </Suspense>
    </PortalAuthShell>
  );
}
