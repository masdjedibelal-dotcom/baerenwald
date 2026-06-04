import { Suspense } from "react";
import { redirect } from "next/navigation";

import { PortalClient } from "@/components/portal/PortalClient";
import { PortalAuthShell } from "@/components/portal/PortalAuthShell";
import { getPortalDataForKunde } from "@/lib/portal/get-portal-data";
import { linkPortalKundeToAuthUser } from "@/lib/portal/link-portal-kunde";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase";

export const metadata = {
  title: "MeinBärenwald",
  robots: { index: false, follow: false },
};

export default async function PortalDashboardPage() {
  if (!isSupabaseConfigured()) {
    return (
      <PortalAuthShell title="Portal nicht verfügbar">
        <p className="portal-text-body text-text-secondary">
          Die Verbindung zur Datenbank ist nicht konfiguriert.
        </p>
      </PortalAuthShell>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/portal/login");
  }

  const emailConfirmed = Boolean(user.email_confirmed_at ?? user.confirmed_at);
  if (!emailConfirmed) {
    redirect("/portal/login?hint=confirm");
  }

  const meta = user.user_metadata as { name?: string; telefon?: string };
  const link = await linkPortalKundeToAuthUser({
    userId: user.id,
    email: user.email,
    name: meta?.name,
    telefon: meta?.telefon,
  });

  if (!link.ok) {
    return (
      <PortalAuthShell title="Konto konnte nicht verknüpft werden">
        <p className="portal-text-body text-text-secondary">{link.error}</p>
        <form action="/portal/auth/signout" method="post" className="mt-4">
          <button type="submit" className="btn-pill-outline w-full !py-2.5">
            Abmelden
          </button>
        </form>
      </PortalAuthShell>
    );
  }

  const data = await getPortalDataForKunde(link.kundeId);
  if (!data) {
    return (
      <PortalAuthShell title="Keine Kundendaten">
        <p className="portal-text-body text-text-secondary">
          Dein Konto ist aktiv, aber es wurden keine Daten gefunden. Bitte wende
          dich an uns.
        </p>
      </PortalAuthShell>
    );
  }

  const { kunde, auftraege, angebote, leads } = data;

  return (
    <Suspense
      fallback={
        <p className="px-4 py-8 text-center portal-text-body text-text-secondary">
          Portal wird geladen…
        </p>
      }
    >
      <PortalClient
        kunde={kunde}
        auftraege={auftraege}
        angebote={angebote}
        leads={leads}
      />
    </Suspense>
  );
}
