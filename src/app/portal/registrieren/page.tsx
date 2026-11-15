import { Suspense } from "react";

import { PortalAuthShell } from "@/components/portal/PortalAuthShell";
import { PortalRegisterForm } from "@/components/portal/PortalRegisterForm";
import { loadMeldeContactByToken } from "@/lib/melde/melde-bestaetigung";
import { funktionAn, MARKE } from "@/lib/marke";
import { pruefePortalEinladung } from "@/lib/portal/portal-einladung";
import Link from "next/link";

export const metadata = {
  title: `Registrieren — ${MARKE.portalName}`,
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

  // Marken mit `nurEinladung` (TEO): Konto nur mit Einladung (Verwaltung oder Link aus dem CRM)
  const nurEinladung = funktionAn("nurEinladung");
  const einladung = nurEinladung
    ? await pruefePortalEinladung(prefill.email, first(searchParams?.einladung))
    : null;

  if (einladung && !einladung.ok) {
    return (
      <PortalAuthShell
        title="Zugang nur auf Einladung"
        subtitle={`Ein Konto bei ${MARKE.portalName} richten wir für Sie ein. Danach bekommen Sie einen Link per E-Mail und legen Ihr Passwort fest.`}
      >
        <div className="flex flex-col gap-3">
          <Link href="/#kontakt" className="btn-pill-primary text-center !py-2.5">
            Kontakt aufnehmen
          </Link>
          <Link href="/portal/login" className="btn-pill-outline text-center !py-2.5">
            Ich habe schon ein Konto
          </Link>
        </div>
      </PortalAuthShell>
    );
  }

  const serviceHinweis =
    einladung?.ok && einladung.orgName
      ? `${MARKE.name} ist der Handwerks-Service von ${einladung.orgName}. `
      : "";

  const subtitle = einladung?.ok
    ? `${serviceHinweis}Legen Sie Ihren Zugang an: Passwort vergeben und zustimmen.`
    : locked
      ? "Angaben aus Ihrer Schadenmeldung — bitte Kundentyp wählen, Passwort vergeben und zustimmen."
      : "Privat, Gewerbe oder Hausverwaltung — danach legen wir Ihren Kundenstamm im Portal an.";

  return (
    <PortalAuthShell title="Konto anlegen" subtitle={subtitle}>
      <Suspense
        fallback={
          <p className="text-center text-sm text-text-secondary">Laden…</p>
        }
      >
        <PortalRegisterForm
          prefill={prefill}
          lockedHint={
            einladung?.ok
              ? "Ihre E-Mail ist aus der Einladung übernommen. Bitte Kundentyp wählen, Passwort vergeben und zustimmen."
              : undefined
          }
        />
      </Suspense>
    </PortalAuthShell>
  );
}
