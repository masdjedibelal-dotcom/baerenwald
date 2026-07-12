import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { PartnerAuthFlowHint } from "@/components/partner/PartnerAuthFlowHint";
import { PartnerAuthShell } from "@/components/partner/PartnerAuthShell";
import { PartnerClient } from "@/components/partner/PartnerClient";
import { PARTNER_AUTH_COPY } from "@/lib/partner/partner-auth-copy";
import { getPartnerDataForHandwerker } from "@/lib/partner/get-partner-data";
import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import { SITE_CONFIG } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase";

export const metadata = {
  title: "Partner — Bärenwald",
  robots: { index: false, follow: false },
};

function partnerLoginRedirect(
  searchParams?: Record<string, string | string[] | undefined>,
  hint?: string
): string {
  const qs = new URLSearchParams();
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (typeof value === "string") qs.set(key, value);
      else if (Array.isArray(value) && value[0]) qs.set(key, value[0]);
    }
  }
  const next = qs.toString() ? `/partner?${qs}` : "/partner";
  const loginQs = new URLSearchParams({ next });
  if (hint) loginQs.set("hint", hint);
  return `/partner/login?${loginQs}`;
}

export default async function PartnerDashboardPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
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
    redirect(partnerLoginRedirect(searchParams));
  }

  const emailConfirmed = Boolean(user.email_confirmed_at ?? user.confirmed_at);
  if (!emailConfirmed) {
    redirect(partnerLoginRedirect(searchParams, "confirm"));
  }

  const link = await linkPortalHandwerkerToAuthUser({
    userId: user.id,
    email: user.email,
  });

  if (!link.ok) {
    return (
      <PartnerAuthShell title={PARTNER_AUTH_COPY.blocked.title}>
        <div className="space-y-4">
          <p className="portal-text-body text-text-secondary">
            Eingeloggt als <strong>{user.email}</strong>. Für das Partner-Portal bitte mit der
            Betriebs-E-Mail aus dem CRM-Stamm anmelden.
          </p>
          <p className="portal-text-body text-text-secondary">{link.error}</p>
          <PartnerAuthFlowHint variant="blocked" />
          <div className="flex flex-col gap-2">
            <Link href="/partner/registrieren" className="btn-pill-primary text-center !py-2.5">
              Zur Registrierung
            </Link>
            <a
              href={`mailto:${SITE_CONFIG.email}`}
              className="btn-pill-outline text-center !py-2.5"
            >
              Bärenwald kontaktieren
            </a>
          </div>
          <form action="/partner/auth/signout" method="post">
            <button type="submit" className="btn-pill-outline w-full !py-2.5">
              Abmelden
            </button>
          </form>
        </div>
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
        profil={data.profil}
        termine={data.termine}
        aufgaben={data.aufgaben}
        anfragen={data.anfragen}
        angebote={data.angebote}
        angeboteAlleAkzeptiert={data.angeboteAlleAkzeptiert}
        vorgaenge={data.vorgaenge}
        auftragAnfragen={data.auftragAnfragen}
        auftraege={data.auftraege}
        offen={data.offen}
      />
    </Suspense>
  );
}
