"use client";

import { PortalShell } from "@/components/shared/PortalShell";
import { useMemo, useState } from "react";
import {
  Building2,
  ClipboardList,
  LayoutDashboard,
  Package,
  PlusCircle,
  UserRound,
} from "lucide-react";

import { OrganisationWiedervorlagenCard } from "@/components/org/OrganisationWiedervorlagenCard";
import { HvNotificationBell } from "@/components/org/HvNotificationBell";
import { OrganisationAktiveAbosPanel } from "@/components/org/OrganisationAktiveAbosPanel";
import { OrganisationLeistungenPanel } from "@/components/org/OrganisationLeistungenPanel";
import { OrganisationSuche } from "@/components/org/OrganisationSuche";
import { OrganisationAnfrageHub } from "@/components/org/OrganisationAnfrageHub";
import { OrganisationObjektePanel } from "@/components/org/OrganisationObjektePanel";
import { OrganisationProfilPanel } from "@/components/org/OrganisationProfilPanel";
import { OrganisationWhitelabelGate } from "@/components/org/OrganisationWhitelabelGate";
import { OrganisationVorgaengeSection } from "@/components/org/OrganisationVorgaengeSection";
import {
  orgWhitelabelGateCanComplete,
  orgWhitelabelGateVisible,
} from "@/lib/org/org-whitelabel-gate";
import { PortalListCard } from "@/components/shared/PortalListCard";
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
import { filterKundeVorgaenge } from "@/lib/portal/kunde-vorgang-filter";
import { buildKundeVorgangCardRows } from "@/lib/portal/portal-list-mappers";
import { portalDetailStatusPillClass } from "@/lib/shared/portal-detail-format";

type OrgSection = "uebersicht" | "vorgaenge" | "objekte" | "leistungen" | "profil";

const NAV: Array<{ id: OrgSection; label: string; icon: typeof LayoutDashboard }> = [
  { id: "uebersicht", label: "Übersicht", icon: LayoutDashboard },
  { id: "vorgaenge", label: "Vorgänge", icon: ClipboardList },
  { id: "objekte", label: "Objekte", icon: Building2 },
  { id: "leistungen", label: "Leistungen", icon: Package },
  { id: "profil", label: "Profil", icon: UserRound },
];

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
  katalogProdukte = [],
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

  const activeTeaserRows = buildKundeVorgangCardRows(
    filterKundeVorgaenge(vorgaengeItems, "aktiv")
  ).slice(0, 5);

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
        brandSubtitle="Hausverwaltung"
        brandLogoUrl={kunde.org_logo_url}
        orgPrimaryColor={kunde.org_primary_color}
        activeNavId={section}
        onNavChange={(id) => switchSection(id as OrgSection)}
        nav={NAV.map(({ id, label, icon }) => ({
          id,
          label,
          icon,
          badge: id === "vorgaenge" ? vorgaengeBadgeCount : undefined,
        }))}
        footer={displayName}
        fab={{
          label: "Neue Anfrage",
          onClick: () => setHubOpen(true),
          icon: PlusCircle,
        }}
        headerActions={
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
              <div className="space-y-0.5">
                <p className="portal-text-section text-text-primary">Heute</p>
                <p className="portal-text-body text-text-secondary">
                  Was jetzt Ihre Aufmerksamkeit braucht — Freigaben, Notfälle, laufende Vorgänge
                </p>
              </div>

              <div className="grid min-w-0 grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => openVorgaenge("freigabe")}
                  className="portal-kpi-card text-left"
                >
                  <p className="portal-kpi-label">Zur Freigabe</p>
                  <p className="portal-kpi-value">{filterCounts.freigabe}</p>
                </button>
                <button
                  type="button"
                  onClick={() => openVorgaenge("aktiv")}
                  className="portal-kpi-card text-left"
                >
                  <p className="portal-kpi-label">Aktiv</p>
                  <p className="portal-kpi-value">{filterCounts.aktiv}</p>
                </button>
                <button
                  type="button"
                  onClick={() => openVorgaenge("erledigt")}
                  className="portal-kpi-card text-left"
                >
                  <p className="portal-kpi-label">Erledigt</p>
                  <p className="portal-kpi-value">{filterCounts.erledigt}</p>
                </button>
              </div>

              <OrganisationWiedervorlagenCard />

              <button
                type="button"
                className="btn-pill-primary inline-flex items-center gap-2"
                onClick={() => setHubOpen(true)}
              >
                <PlusCircle className="h-4 w-4" />
                Neue Anfrage
              </button>

              <article className="card-bordered p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="font-semibold text-text-primary">Aktive Vorgänge</h2>
                  <button
                    type="button"
                    onClick={() => openVorgaenge("aktiv")}
                    className="portal-text-meta font-semibold text-accent"
                  >
                    Alle anzeigen
                  </button>
                </div>
                <div className="space-y-2">
                  {activeTeaserRows.map((row) => (
                    <PortalListCard
                      key={row.id}
                      title={row.title}
                      subtitle={row.subtitle}
                      statusLabel={row.statusLabel}
                      statusPillClass={portalDetailStatusPillClass(row.statusPillKey)}
                      accent={row.accent}
                      meta={row.meta}
                      hint={row.hint}
                      footer={row.footer}
                      onClick={() => openVorgaenge("aktiv")}
                    />
                  ))}
                  {filterCounts.aktiv === 0 ? (
                    <p className="portal-text-body py-4 text-center text-text-secondary">
                      Noch keine aktiven Vorgänge.
                    </p>
                  ) : null}
                </div>
              </article>
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
              orgKennung={kunde.org_kennung}
              onRefresh={refresh}
            />
          ) : null}

          {section === "leistungen" ? (
            <div className="space-y-8">
              <OrganisationAktiveAbosPanel />
              <OrganisationLeistungenPanel
                kunde={kunde}
                objekte={objekte}
                produkte={katalogProdukte}
                onOrdered={refresh}
              />
            </div>
          ) : null}

          {section === "profil" ? (
            <>
              <div className="space-y-0.5">
                <p className="portal-text-section text-text-primary">Profil</p>
                <p className="portal-text-body text-text-secondary">
                  Organisation, Melde-Material und Freigabe-Regeln
                </p>
              </div>
              <OrganisationProfilPanel
                kunde={kunde}
                objektCount={objekte.length}
                onSaved={refresh}
                isAdmin={mitgliedRolle === "admin"}
              />
            </>
          ) : null}
      </PortalShell>

      {hubOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5">
            <p className="mb-3 text-lg font-semibold">Neue Anfrage</p>
            <OrganisationAnfrageHub
              objekte={objekte}
              kundeEmail={kunde.email}
              kundeName={kunde.name}
              onClose={() => setHubOpen(false)}
              onDone={() => {
                setHubOpen(false);
                refresh();
              }}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
