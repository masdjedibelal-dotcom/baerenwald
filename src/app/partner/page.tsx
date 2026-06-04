import { Suspense } from "react";
import { redirect } from "next/navigation";

import { PartnerClient } from "@/components/partner/PartnerClient";
import { PartnerAuthShell } from "@/components/partner/PartnerAuthShell";
import { getPartnerDataForHandwerker } from "@/lib/partner/get-partner-data";
import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase";

export const metadata = {
  title: "Partner — Bärenwald",
  robots: { index: false, follow: false },
};

export default async function PartnerDashboardPage() {
  if (!isSupabaseConfigured()) {
    return (
      <PartnerAuthShell title="Portal nicht verfügbar">
        <p className="portal-text-body text-text-secondary">
          Die Verbindung zur Datenbank ist nicht konfiguriert.
        </p>
      </PartnerAuthShell>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/partner/login");
  }

  const emailConfirmed = Boolean(user.email_confirmed_at ?? user.confirmed_at);
  if (!emailConfirmed) {
    redirect("/partner/login?hint=confirm");
  }

  const link = await linkPortalHandwerkerToAuthUser({
    userId: user.id,
    email: user.email,
  });

  if (!link.ok) {
    return (
      <PartnerAuthShell title="Zugang nicht möglich">
        <p className="portal-text-body text-text-secondary">{link.error}</p>
        <form action="/partner/auth/signout" method="post" className="mt-4">
          <button type="submit" className="btn-pill-outline w-full !py-2.5">
            Abmelden
          </button>
        </form>
      </PartnerAuthShell>
    );
  }

  const data = await getPartnerDataForHandwerker(link.handwerkerId);
  if (!data) {
    return (
      <PartnerAuthShell title="Keine Partnerdaten">
        <p className="portal-text-body text-text-secondary">
          Dein Konto ist aktiv, aber es wurden keine Daten gefunden.
        </p>
      </PartnerAuthShell>
    );
  }

  return (
    <Suspense
      fallback={
        <p className="px-4 py-8 text-center portal-text-body text-text-secondary">Portal wird geladen…</p>
      }
    >
      <PartnerClient
        handwerker={data.handwerker}
        anfragen={data.anfragen}
        angebote={data.angebote}
        angeboteAlleAkzeptiert={data.angeboteAlleAkzeptiert}
        auftragAnfragen={data.auftragAnfragen}
        auftraege={data.auftraege}
      />
    </Suspense>
  );
}
