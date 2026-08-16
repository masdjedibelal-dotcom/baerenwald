import { Suspense } from "react";
import { redirect } from "next/navigation";

import { OrganisationPortalClient } from "@/components/org/OrganisationPortalClient";
import { EigentuemerPortalClient } from "@/components/portal/EigentuemerPortalClient";
import { PortalClient } from "@/components/portal/PortalClient";
import { PortalAuthShell } from "@/components/portal/PortalAuthShell";
import { PortalContentBusy } from "@/components/shared/PortalContentBusy";
import { SITE_CONFIG } from "@/lib/config";
import { resolveOrgMitgliedRolle } from "@/lib/org/org-rbac";
import { getOrganisationPortalData } from "@/lib/org/get-organisation-portal-data";
import { getEigentuemerPortalData } from "@/lib/portal/get-eigentuemer-portal-data";
import { getPortalDataForKunde } from "@/lib/portal/get-portal-data";
import { linkPortalKundeToAuthUser } from "@/lib/portal/link-portal-kunde";
import {
  buildSlimPortalListPayload,
  slimFunnelForList,
} from "@/lib/portal/slim-portal-list-payload";
import { resolvePortalKundeTyp } from "@/lib/portal2/kunde-typ";
import { clearAdminViewCookie } from "@/lib/auth/crm-impersonation-session";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

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
    if (link.signOut) {
      clearAdminViewCookie();
      await supabase.auth.signOut({ scope: "local" });
      redirect("/portal/login?hint=session_mismatch");
    }
    return (
      <PortalAuthShell title="Konto konnte nicht verknüpft werden">
        <p className="portal-text-body text-text-secondary">
          Eingeloggt als <strong>{user.email}</strong>. {link.error}
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <a
            href={`mailto:${SITE_CONFIG.email}?subject=${encodeURIComponent("MeinBärenwald – Konto verknüpfen")}`}
            className="btn-pill-primary w-full text-center !py-2.5"
          >
            Support kontaktieren
          </a>
          <form action="/portal/auth/signout" method="post">
            <button type="submit" className="btn-pill-outline w-full !py-2.5">
              Abmelden
            </button>
          </form>
        </div>
      </PortalAuthShell>
    );
  }

  // Offene HM-/Bewohner-Einladungen zur Login-E-Mail (Auth existiert schon → ohne Redeem nur privat)
  const {
    tryRedeemOpenHausmeisterInvitesForAuthUser,
    tryRedeemOpenBewohnerInvitesForAuthUser,
  } = await import("@/lib/portal2/portal-einladungen-server");
  const hmRedeem = await tryRedeemOpenHausmeisterInvitesForAuthUser({
    authUserId: user.id,
    email: user.email,
    name: meta?.name,
    telefon: meta?.telefon,
  });
  const bewRedeem = hmRedeem.redeemed
    ? { redeemed: false as const }
    : await tryRedeemOpenBewohnerInvitesForAuthUser({
        authUserId: user.id,
        email: user.email,
        name: meta?.name,
        telefon: meta?.telefon,
      });
  const portalKundeId =
    hmRedeem.portalKundeId ?? bewRedeem.portalKundeId ?? link.kundeId;

  const { data: kundeMeta } = await supabaseAdmin
    .from("kunden")
    .select("portal_modus, typ")
    .eq("id", portalKundeId)
    .maybeSingle();

  let portalModus =
    (kundeMeta as { portal_modus?: string } | null)?.portal_modus ?? "privat";
  let kundeTypField =
    (kundeMeta as { typ?: string | null } | null)?.typ ?? null;

  if (!kundeMeta) {
    const { data: fallback } = await supabaseAdmin
      .from("kunden")
      .select("portal_modus")
      .eq("id", portalKundeId)
      .maybeSingle();
    portalModus = (fallback?.portal_modus as string | undefined) ?? "privat";
    kundeTypField = null;
  }

  /** D8 — eigene Rolle / Client */
  if (portalModus === "eigentuemer") {
    const eigData = await getEigentuemerPortalData(portalKundeId);
    if (!eigData) {
      return (
        <PortalAuthShell title="Keine Kundendaten">
          <p className="portal-text-body text-text-secondary">
            Eigentümer-Daten konnten nicht geladen werden.
          </p>
        </PortalAuthShell>
      );
    }
    return (
      <Suspense
        fallback={
          <PortalContentBusy
            variant="page"
            title="Portal wird geladen…"
            body="Einen Moment — wir bereiten Ihre Übersicht vor."
          />
        }
      >
        <EigentuemerPortalClient
          kunde={eigData.kunde}
          schwelleEur={eigData.schwelleEur}
          objekte={eigData.objekte}
          einheiten={eigData.einheiten}
          mieterByObjektId={eigData.mieterByObjektId}
          hausverwaltungBrand={eigData.hausverwaltungBrand}
          leads={eigData.leads}
          angebote={eigData.angebote}
          auftraege={eigData.auftraege}
        />
      </Suspense>
    );
  }

  if (portalModus === "hausmeister") {
    const { getHausmeisterPortalData } = await import(
      "@/lib/portal/get-hausmeister-portal-data"
    );
    const { HausmeisterPortalClient } = await import(
      "@/components/portal/HausmeisterPortalClient"
    );
    const hmData = await getHausmeisterPortalData(portalKundeId);
    if (!hmData) {
      return (
        <PortalAuthShell title="Keine Kundendaten">
          <p className="portal-text-body text-text-secondary">
            Hausmeister-Daten konnten nicht geladen werden.
          </p>
        </PortalAuthShell>
      );
    }
    return (
      <Suspense
        fallback={
          <PortalContentBusy
            variant="page"
            title="Portal wird geladen…"
            body="Einen Moment — wir bereiten Ihre Übersicht vor."
          />
        }
      >
        <HausmeisterPortalClient
          kunde={hmData.kunde}
          objekte={hmData.objekte}
          hausverwaltungBrand={hmData.hausverwaltungBrand}
          leads={hmData.leads}
          angebote={hmData.angebote}
          auftraege={hmData.auftraege}
        />
      </Suspense>
    );
  }

  const kundeTyp = resolvePortalKundeTyp({
    portal_modus: portalModus,
    typ: kundeTypField,
  });

  if (kundeTyp === "hv" || portalModus === "organisation") {
    const [orgData, mitgliedRolle] = await Promise.all([
      getOrganisationPortalData(portalKundeId),
      resolveOrgMitgliedRolle(user.id, portalKundeId),
    ]);
    if (!orgData) {
      return (
        <PortalAuthShell title="Keine Kundendaten">
          <p className="portal-text-body text-text-secondary">
            Auftraggeber-Daten konnten nicht geladen werden.
          </p>
        </PortalAuthShell>
      );
    }

    const slimOrg = buildSlimPortalListPayload({
      leads: orgData.leads as Array<Record<string, unknown> & { id: string }>,
      angebote: orgData.angebote as Array<
        Record<string, unknown> & { id: string }
      >,
      auftraege: orgData.auftraege as Array<
        Record<string, unknown> & { id: string }
      >,
      hvPortalMode: true,
    });
    const slimEingang = orgData.eingang.map((l) => ({
      ...l,
      funnel_daten: slimFunnelForList(
        (l as { funnel_daten?: unknown }).funnel_daten
      ),
      dokumente: [],
    }));

    return (
      <Suspense
        fallback={
          <PortalContentBusy
            variant="page"
            title="Portal wird geladen…"
            body="Einen Moment — wir bereiten Ihre Übersicht vor."
          />
        }
      >
        <OrganisationPortalClient
          kunde={orgData.kunde}
          objekte={orgData.objekte}
          eingang={slimEingang as typeof orgData.eingang}
          leads={slimOrg.leads as typeof orgData.leads}
          angebote={slimOrg.angebote as typeof orgData.angebote}
          auftraege={slimOrg.auftraege as typeof orgData.auftraege}
          initialVorgaenge={slimOrg.initialVorgaenge}
          mitgliedRolle={mitgliedRolle}
          bautagebuchByLeadId={orgData.bautagebuchByLeadId}
          hwErledigtByLeadId={orgData.hwErledigtByLeadId}
          feedbackBereitByLeadId={orgData.feedbackBereitByLeadId}
          hvFeedbackByLeadId={orgData.hvFeedbackByLeadId}
          auftragIdByLeadId={orgData.auftragIdByLeadId}
          hvAbnahmeByLeadId={orgData.hvAbnahmeByLeadId}
          auftragKontextByLeadId={orgData.auftragKontextByLeadId}
          dokumenteByLeadId={orgData.dokumenteByLeadId}
        />
      </Suspense>
    );
  }

  const data = await getPortalDataForKunde(portalKundeId, { mode: "list" });
  if (!data) {
    return (
      <PortalAuthShell title="Keine Kundendaten">
        <p className="portal-text-body text-text-secondary">
          Ihr Konto ist aktiv, aber es wurden keine Daten gefunden. Bitte wenden
          Sie sich an uns.
        </p>
      </PortalAuthShell>
    );
  }

  const slim = buildSlimPortalListPayload({
    leads: data.leads as Array<Record<string, unknown> & { id: string }>,
    angebote: data.angebote as Array<Record<string, unknown> & { id: string }>,
    auftraege: data.auftraege as Array<Record<string, unknown> & { id: string }>,
    hvPortalMode: false,
    mieterStatusMode: true,
    mieterFeedbackByLeadId: data.mieterFeedbackByLeadId,
  });

  return (
    <Suspense
      fallback={
        <PortalContentBusy
          variant="page"
          title="Portal wird geladen…"
          body="Einen Moment — wir bereiten Ihre Übersicht vor."
        />
      }
    >
      <PortalClient
        kunde={data.kunde}
        auftraege={slim.auftraege as typeof data.auftraege}
        angebote={slim.angebote as typeof data.angebote}
        leads={slim.leads as typeof data.leads}
        initialVorgaenge={slim.initialVorgaenge}
        mieterFeedbackByLeadId={data.mieterFeedbackByLeadId ?? {}}
        hausverwaltungBrand={data.hausverwaltungBrand}
        kundeTyp={kundeTyp === "gewerbe" ? "gewerbe" : "privat"}
      />
    </Suspense>
  );
}
