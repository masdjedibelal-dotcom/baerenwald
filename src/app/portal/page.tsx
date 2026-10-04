import { logDbError } from '@/lib/errors/log-db-error'
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

export default async function PortalDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string }>;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <PortalAuthShell title="Portal nicht verfügbar">
        <p className="portal-text-body text-text-secondary">
          Die Verbindung zur Datenbank ist nicht konfiguriert.
        </p>
      </PortalAuthShell>
    );
  }

  void searchParams;

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

  const meta = user.user_metadata as {
    name?: string;
    telefon?: string;
    vorname?: string;
    nachname?: string;
    firma?: string;
    strasse?: string;
    hausnummer?: string;
    plz?: string;
    ort?: string;
    kundentyp?: string;
  };
  const link = await linkPortalKundeToAuthUser({
    userId: user.id,
    email: user.email,
    name: meta?.name,
    telefon: meta?.telefon,
    typ: meta?.kundentyp,
    vorname: meta?.vorname,
    nachname: meta?.nachname,
    firma: meta?.firma,
    strasse: meta?.strasse,
    hausnummer: meta?.hausnummer,
    plz: meta?.plz,
    ort: meta?.ort,
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

  // Hausmeister- und Mieter-Konten entfallen (04.10.2026) — keine Einladungen mehr einlösen
  let portalKundeId = link.kundeId;

  // Wenn zur E-Mail ein Org-Konto existiert, immer dorthin
  {
    const {data: orgKunde, error: __dbErr249_3} = await supabaseAdmin
      .from("kunden")
      .select("id")
      .ilike("email", user.email.trim().toLowerCase())
      .eq("portal_modus", "organisation")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (__dbErr249_3) logDbError('app/portal/page:kunden', __dbErr249_3)
    if (orgKunde?.id) {
      portalKundeId = String(orgKunde.id);
    }
  }

  const {data: kundeMeta, error: __dbErr250_4} = await supabaseAdmin
    .from("kunden")
    .select("portal_modus, typ")
    .eq("id", portalKundeId)
    .maybeSingle();
  if (__dbErr250_4) logDbError('app/portal/page:kunden', __dbErr250_4)
  let portalModus =
    (kundeMeta as { portal_modus?: string } | null)?.portal_modus ?? "privat";
  let kundeTypField =
    (kundeMeta as { typ?: string | null } | null)?.typ ?? null;

  if (!kundeMeta) {
    const {data: fallback, error: __dbErr251_5} = await supabaseAdmin
      .from("kunden")
      .select("portal_modus")
      .eq("id", portalKundeId)
      .maybeSingle();
    if (__dbErr251_5) logDbError('app/portal/page:kunden', __dbErr251_5)
    portalModus = (fallback?.portal_modus as string | undefined) ?? "privat";
    kundeTypField = null;
  }

  // Mieter melden per Link, Hausmeister gibt es nicht mehr → kein Portal (04.10.2026)
  if (portalModus === "mieter" || portalModus === "hausmeister") {
    return (
      <PortalAuthShell title="Kein Zugang mehr nötig">
        <div className="space-y-4">
          <p className="portal-text-body text-text-secondary">
            Schäden melden Sie einfach über den Melde-Link oder QR-Code Ihrer Hausverwaltung.
            Den Stand Ihrer Meldung sehen Sie über den Link in Ihrer Bestätigungs-Mail —
            ein Konto brauchen Sie dafür nicht.
          </p>
          <form action="/portal/auth/signout" method="post">
            <button type="submit" className="btn-pill-outline w-full !py-2.5">
              Abmelden
            </button>
          </form>
        </div>
      </PortalAuthShell>
    );
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
        mieterMelde={data.mieterMelde ?? null}
        kundeTyp={kundeTyp === "gewerbe" ? "gewerbe" : "privat"}
      />
    </Suspense>
  );
}
