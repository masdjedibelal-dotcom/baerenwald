"use client";

import { OrganisationWiedervorlagenCard } from "@/components/org/OrganisationWiedervorlagenCard";
import { OrganisationHvDashboard } from "@/components/org/OrganisationHvDashboard";
import { HvNotificationBell } from "@/components/org/HvNotificationBell";
import { OrganisationAktiveAbosPanel } from "@/components/org/OrganisationAktiveAbosPanel";
import { OrganisationServicepaketePanel } from "@/components/org/OrganisationServicepaketePanel";
import { OrganisationSuche } from "@/components/org/OrganisationSuche";
import { OrganisationAnfrageHub } from "@/components/org/OrganisationAnfrageHub";
import { OrganisationObjektePanel } from "@/components/org/OrganisationObjektePanel";
import { OrganisationEinstellungenScreen } from "@/components/org/OrganisationEinstellungenScreen";
import { OrganisationWhitelabelGate } from "@/components/org/OrganisationWhitelabelGate";
import { OrganisationVorgaengeSection } from "@/components/org/OrganisationVorgaengeSection";
import {
  orgWhitelabelGateCanComplete,
  orgWhitelabelGateVisible,
} from "@/lib/org/org-whitelabel-gate";
import { useRouter, useSearchParams } from "next/navigation";
import {
  buildOrgVorgangFilterCounts,
  buildAuftragByLeadId,
  type OrgVorgangFilter,
} from "@/lib/org/org-vorgang-filter";
import type { KatalogProdukt } from "@/lib/katalog/katalog-produkte";
import type {
  OrganisationKunde,
  OrganisationLead,
  OrganisationObjekt,
} from "@/lib/org/types";
import type { OrgPartnerBefundEntry } from "@/lib/org/load-partner-befund";
import type { OrgMitgliedRolle } from "@/lib/org/org-rbac";
import { buildKundeVorgaenge } from "@/lib/portal/build-kunde-vorgaenge";
import { isMeldeNotfall } from "@/lib/org/org-eingang-utils";
import { meldeKategorieLabel } from "@/lib/org/melde-kategorien";
import { meldeKategorieFromLead } from "@/lib/org/org-eingang-utils";
import {
  buildHvDashboardKpis,
  countLeadsByPortalFlow,
  resolveLeadPortalFlowStatus,
} from "@/lib/portal2/hv-dashboard";
import { portalCreateLabel } from "@/lib/portal2/create";
import { buildPortalShellNav } from "@/lib/portal2/nav-items";
import { PlusCircle } from "lucide-react";
import { PortalShell } from "@/components/shared/PortalShell";
import { useMemo, useState } from "react";

type OrgSection = "uebersicht" | "vorgaenge" | "objekte" | "leistungen" | "profil";

type Props = {
  kunde: OrganisationKunde;
  objekte: OrganisationObjekt[];
  eingang: OrganisationLead[];
  leads: OrganisationLead[];
  angebote: Parameters<typeof OrganisationVorgaengeSection>[0]["angebote"];
  auftraege: Parameters<typeof OrganisationVorgaengeSection>[0]["auftraege"];
  katalogProdukte?: KatalogProdukt[];
  mitgliedRolle?: OrgMitgliedRolle;
  partnerBefundByLeadId?: Record<string, OrgPartnerBefundEntry[]>;
  bautagebuchByLeadId?: Record<
    string,
    Array<{
      id?: string;
      datum?: string;
      created_at?: string;
      titel?: string;
      notiz?: string;
      fotos_urls?: string[];
    }>
  >;
  hwErledigtByLeadId?: Record<string, boolean>;
  feedbackBereitByLeadId?: Record<string, boolean>;
  hvFeedbackByLeadId?: Record<
    string,
    {
      bewertung?: { sterne: number; freitext?: string | null } | null;
      maengel?: Array<{ freitext?: string | null; created_at?: string }>;
    }
  >;
  auftragKontextByLeadId?: Record<
    string,
    import("@/lib/portal/vorgang-erledigt").PortalAuftragKontext
  >;
  dokumenteByLeadId?: Record<
    string,
    Array<{
      id: string;
      name: string;
      subtitle?: string;
      datum?: string;
      href: string;
    }>
  >;
  auftragIdByLeadId?: Record<string, string>;
  hvAbnahmeByLeadId?: Record<
    string,
    {
      art: "ohne_vorbehalt" | "mit_anmerkung" | "zurueckgewiesen";
      anmerkung?: string | null;
      signiert_name: string;
      signiert_am: string;
    }
  >;
};

function portalSectionFromParam(raw: string | null): OrgSection | null {
  if (raw === "uebersicht" || raw === "objekte" || raw === "profil" || raw === "leistungen") return raw;
  if (
    raw === "vorgaenge" ||
    raw === "freigabe" ||
    raw === "auftraege" ||
    raw === "meldungen" ||
    raw === "eingang" ||
    raw === "anfragen" ||
    raw === "angebote" ||
    raw === "einstellungen"
  ) {
    return "vorgaenge";
  }
  return null;
}

export function OrganisationPortalClient({
  kunde,
  objekte,
  eingang,
  leads,
  angebote,
  auftraege,
  katalogProdukte: _katalogProdukte = [],
  mitgliedRolle = "admin",
  partnerBefundByLeadId = {},
  bautagebuchByLeadId = {},
  hwErledigtByLeadId = {},
  feedbackBereitByLeadId = {},
  hvFeedbackByLeadId = {},
  auftragKontextByLeadId = {},
  dokumenteByLeadId = {},
  auftragIdByLeadId = {},
  hvAbnahmeByLeadId = {},
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSection = portalSectionFromParam(searchParams.get("section"));
  const initialItemId = searchParams.get("id");
  const initialVorgangFilter = ((): OrgVorgangFilter | null => {
    const f = searchParams.get("filter");
    if (f === "freigabe" || f === "aktiv" || f === "erledigt") return f;
    return null;
  })();

  const [section, setSection] = useState<OrgSection>(initialSection ?? "uebersicht");
  const [hubOpen, setHubOpen] = useState(false);

  const displayName =
    kunde.org_anzeigename?.trim() || kunde.name?.trim() || "Hausverwaltung";

  const vorgaengeItems = useMemo(
    () =>
      buildKundeVorgaenge({
        leads: leads as Parameters<typeof buildKundeVorgaenge>[0]["leads"],
        angebote: angebote as Parameters<typeof buildKundeVorgaenge>[0]["angebote"],
        auftraege,
        hvPortalMode: true,
      }),
    [leads, angebote, auftraege]
  );

  const auftragByLeadId = useMemo(
    () =>
      buildAuftragByLeadId(
        auftraege as Array<{ id: string; lead_id?: string | null }>
      ),
    [auftraege]
  );

  const filterCounts = useMemo(
    () =>
      buildOrgVorgangFilterCounts(
        eingang,
        leads,
        vorgaengeItems,
        auftragByLeadId
      ),
    [eingang, leads, vorgaengeItems, auftragByLeadId]
  );

  const vorgaengeBadgeCount = filterCounts.freigabe;

  const refresh = () => router.refresh();

  function switchSection(next: OrgSection) {
    setSection(next);
    router.replace(`/portal?section=${next}`, { scroll: false });
  }

  function openVorgaenge(filter?: OrgVorgangFilter) {
    setSection("vorgaenge");
    const q = filter ? `?section=vorgaenge&filter=${filter}` : "?section=vorgaenge";
    router.replace(`/portal${q}`, { scroll: false });
  }

  const allLeadsForFlow = useMemo(() => {
    const byId = new Map<string, OrganisationLead>();
    for (const l of [...leads, ...eingang]) byId.set(l.id, l);
    return Array.from(byId.values());
  }, [leads, eingang]);

  const hvKpis = useMemo(() => {
    const flow = countLeadsByPortalFlow({
      leads: allLeadsForFlow,
      angebote: angebote as Array<{
        id: string;
        lead_id?: string | null;
        status?: string | null;
        status_einfach?: string | null;
      }>,
      auftraege: auftraege as Array<{
        id: string;
        lead_id?: string | null;
        status?: string | null;
      }>,
    });
    return buildHvDashboardKpis(flow);
  }, [allLeadsForFlow, angebote, auftraege]);

  const recentItems = useMemo(() => {
    const angebotByLead = new Map(
      (angebote as Array<{ id: string; lead_id?: string | null }>).map((a) => [
        String(a.lead_id ?? ""),
        a,
      ])
    );
    const auftragByLeadMap = new Map(
      (auftraege as Array<{ id: string; lead_id?: string | null }>).map((a) => [
        String(a.lead_id ?? ""),
        a,
      ])
    );
    return [...allLeadsForFlow]
      .sort((a, b) => {
        const ta = new Date(a.created_at ?? 0).getTime();
        const tb = new Date(b.created_at ?? 0).getTime();
        return tb - ta;
      })
      .slice(0, 4)
      .map((lead) => {
        const kat = meldeKategorieFromLead(lead);
        const titel =
          (kat ? meldeKategorieLabel(kat) : null) ||
          lead.kontakt_nachricht?.slice(0, 60) ||
          lead.melder_name ||
          "Vorgang";
        const obj =
          (lead as { objekt?: { titel?: string; name?: string } }).objekt
            ?.titel ||
          (lead as { objekt?: { name?: string } }).objekt?.name ||
          lead.melder_einheit ||
          "Objekt";
        return {
          id: lead.id,
          titel,
          objekt: String(obj),
          flowStatus: resolveLeadPortalFlowStatus({
            lead,
            angebot: angebotByLead.get(lead.id) ?? null,
            auftrag: auftragByLeadMap.get(lead.id) ?? null,
          }),
          notfall: isMeldeNotfall(lead),
        };
      });
  }, [allLeadsForFlow, angebote, auftraege]);

  const showWlGate = orgWhitelabelGateVisible(kunde, mitgliedRolle);
  const canCompleteWlGate = orgWhitelabelGateCanComplete(mitgliedRolle);

  return (
    <>
      {showWlGate ? (
        <OrganisationWhitelabelGate
          kunde={kunde}
          canComplete={canCompleteWlGate}
          onComplete={refresh}
        />
      ) : null}
      <PortalShell
        variant="org"
        brandTitle={displayName}
        brandSubtitle={kunde.org_sub?.trim() || "Hausverwaltung"}
        brandLogoUrl={kunde.org_logo_url}
        brandKuerzel={kunde.org_logo_kuerzel}
        orgPrimaryColor={kunde.org_primary_color}
        brandPrimary={kunde.org_primary_color}
        brandPrimaryDk={kunde.org_primary_color_dk}
        brandSoft={kunde.org_primary_color_soft}
        activeNavId={section}
        onNavChange={(id) => switchSection(id as OrgSection)}
        nav={buildPortalShellNav("kunde_hv", "org", {
          liste: vorgaengeBadgeCount,
        })}
        footer={displayName}
        createAction={{
          label: portalCreateLabel("kunde_hv"),
          onClick: () => setHubOpen(true),
        }}
        headerUser={{ name: displayName }}
        notifications={
          <>
            <HvNotificationBell />
            <OrganisationSuche
              onSelect={(id) => {
                openVorgaenge("aktiv");
                router.replace(`/portal?section=vorgaenge&filter=aktiv&id=${id}`, {
                  scroll: false,
                });
              }}
            />
            <form action="/portal/auth/signout" method="post">
              <button type="submit" className="btn-pill-outline portal-btn-compact">
                Abmelden
              </button>
            </form>
          </>
        }
      >
          {section === "uebersicht" ? (
            <>
              <OrganisationHvDashboard
                orgName={displayName}
                kpis={hvKpis}
                recent={recentItems}
                onOpenFilter={openVorgaenge}
                onOpenItem={(id) => {
                  setSection("vorgaenge");
                  router.replace(
                    `/portal?section=vorgaenge&filter=freigabe&id=${id}`,
                    { scroll: false }
                  );
                }}
              />

              <OrganisationWiedervorlagenCard />

              <button
                type="button"
                className="btn-pill-primary inline-flex items-center gap-2"
                onClick={() => setHubOpen(true)}
              >
                <PlusCircle className="h-4 w-4" />
                {portalCreateLabel("kunde_hv")}
              </button>
            </>
          ) : null}

          {section === "vorgaenge" ? (
            <OrganisationVorgaengeSection
              key={initialVorgangFilter ?? "default"}
              kunde={kunde}
              eingang={eingang}
              objekte={objekte}
              leads={leads}
              angebote={angebote}
              auftraege={auftraege}
              initialFilter={initialVorgangFilter}
              initialSelectedId={initialItemId}
              onRefresh={refresh}
              onFilterChange={(f) =>
                router.replace(`/portal?section=vorgaenge&filter=${f}`, { scroll: false })
              }
              partnerBefundByLeadId={partnerBefundByLeadId}
              bautagebuchByLeadId={bautagebuchByLeadId}
              hwErledigtByLeadId={hwErledigtByLeadId}
              feedbackBereitByLeadId={feedbackBereitByLeadId}
              hvFeedbackByLeadId={hvFeedbackByLeadId}
              auftragIdByLeadId={auftragIdByLeadId}
              hvAbnahmeByLeadId={hvAbnahmeByLeadId}
              auftragKontextByLeadId={auftragKontextByLeadId}
              dokumenteByLeadId={dokumenteByLeadId}
            />
          ) : null}

          {section === "objekte" ? (
            <OrganisationObjektePanel
              objekte={objekte}
              leads={[...leads, ...eingang]}
              orgKennung={kunde.org_kennung}
              kunde={kunde}
              onRefresh={refresh}
            />
          ) : null}

          {section === "leistungen" ? (
            <div className="space-y-8">
              <OrganisationServicepaketePanel onRequested={refresh} />
              <OrganisationAktiveAbosPanel />
            </div>
          ) : null}

          {section === "profil" ? (
            <OrganisationEinstellungenScreen
              kunde={kunde}
              objekte={objekte}
              objektCount={objekte.length}
              onSaved={refresh}
              isAdmin={mitgliedRolle === "admin"}
            />
          ) : null}
      </PortalShell>

      {hubOpen ? (
        <OrganisationAnfrageHub
          open={hubOpen}
          objekte={objekte}
          orgKennung={kunde.org_kennung}
          orgAnzeigename={kunde.org_anzeigename ?? kunde.name}
          kundeEmail={kunde.email}
          kundeName={kunde.name}
          onClose={() => setHubOpen(false)}
          onDone={() => {
            setHubOpen(false);
            refresh();
          }}
        />
      ) : null}
    </>
  );
}
