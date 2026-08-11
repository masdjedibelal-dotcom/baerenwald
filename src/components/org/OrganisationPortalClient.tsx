"use client";

import dynamic from "next/dynamic";
import { flushSync } from "react-dom";
import { OrganisationHvDashboard } from "@/components/org/OrganisationHvDashboard";
import { PORTAL_HEADER_HERO_SRC } from "@/lib/portal2/portal-media";
import { emitPortalNotificationsChanged } from "@/lib/portal2/notif-refresh";
import {
  PORTAL_BUSY_MIN_MS,
  usePortalBusy,
} from "@/components/shared/PortalBusyContext";
import { usePortalRefresh } from "@/components/shared/usePortalRefresh";
import { ensurePortalVorgangNotificationHref } from "@/lib/portal2/portal-detail-deep-link";
import { HvNotificationBell } from "@/components/org/HvNotificationBell";
import { OrganisationSuche } from "@/components/org/OrganisationSuche";
import { OrganisationMehrScreen } from "@/components/org/OrganisationMehrScreen";
import { OrganisationWhitelabelGate } from "@/components/org/OrganisationWhitelabelGate";
import { OrganisationVorgaengeSection } from "@/components/org/OrganisationVorgaengeSection";

const OrganisationAktiveAbosPanel = dynamic(
  () =>
    import("@/components/org/OrganisationAktiveAbosPanel").then(
      (m) => m.OrganisationAktiveAbosPanel
    ),
  { ssr: false, loading: () => null }
);
const OrganisationServicepaketePanel = dynamic(
  () =>
    import("@/components/org/OrganisationServicepaketePanel").then(
      (m) => m.OrganisationServicepaketePanel
    ),
  { ssr: false, loading: () => null }
);
const OrganisationMieterwechselPanel = dynamic(
  () =>
    import("@/components/org/OrganisationMieterwechselPanel").then(
      (m) => m.OrganisationMieterwechselPanel
    ),
  { ssr: false, loading: () => null }
);
const OrganisationAnfrageHub = dynamic(
  () =>
    import("@/components/org/OrganisationAnfrageHub").then(
      (m) => m.OrganisationAnfrageHub
    ),
  { ssr: false, loading: () => null }
);
const OrganisationObjektePanel = dynamic(
  () =>
    import("@/components/org/OrganisationObjektePanel").then(
      (m) => m.OrganisationObjektePanel
    ),
  {
    ssr: false,
    loading: () => (
      <p className="px-4 py-8 text-center text-sm text-text-secondary">
        Objekte werden geladen…
      </p>
    ),
  }
);
const OrganisationEinstellungenScreen = dynamic(
  () =>
    import("@/components/org/OrganisationEinstellungenScreen").then(
      (m) => m.OrganisationEinstellungenScreen
    ),
  {
    ssr: false,
    loading: () => (
      <p className="px-4 py-8 text-center text-sm text-text-secondary">
        Einstellungen werden geladen…
      </p>
    ),
  }
);
import { PortalLegalFooter } from "@/components/shared/PortalLegalFooter";
import { PortalShell } from "@/components/shared/PortalShell";
import { resolveOrgSubLabel } from "@/lib/portal2/brand-presets";
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
import type { OrgMitgliedRolle } from "@/lib/org/org-rbac";
import { buildKundeVorgaenge } from "@/lib/portal/build-kunde-vorgaenge";
import { leadIstMeldeDirektauftrag } from "@/lib/funnel/melde-direktauftrag";
import {
  buildHvDashboardKpis,
  countLeadsByPortalFlow,
  resolveLeadPortalFlowStatus,
  type HvDashboardAngebotSlice,
  type HvDashboardAuftragSlice,
} from "@/lib/portal2/hv-dashboard";
import {
  compareByNewestCreated,
  PORTAL_DASHBOARD_RECENT_LIMIT,
} from "@/lib/portal/portal-vorgang-sort";
import { portalCreateLabel } from "@/lib/portal2/create";
import {
  buildPortalHvMobileNav,
  buildPortalShellNav,
} from "@/lib/portal2/nav-items";
import { useEffect, useMemo, useRef, useState } from "react";

type OrgSection =
  | "uebersicht"
  | "vorgaenge"
  | "objekte"
  | "leistungen"
  | "profil"
  | "mehr";

type Props = {
  kunde: OrganisationKunde;
  objekte: OrganisationObjekt[];
  eingang: OrganisationLead[];
  leads: OrganisationLead[];
  angebote: Parameters<typeof OrganisationVorgaengeSection>[0]["angebote"];
  auftraege: Parameters<typeof OrganisationVorgaengeSection>[0]["auftraege"];
  katalogProdukte?: KatalogProdukt[];
  mitgliedRolle?: OrgMitgliedRolle;
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
  /** Server-seitig gebaute List-Items (schlank). */
  initialVorgaenge?: import("@/lib/portal/portal-detail-item").KundePortalDetailItem[];
};

function portalSectionFromParam(raw: string | null): OrgSection | null {
  if (
    raw === "uebersicht" ||
    raw === "objekte" ||
    raw === "profil" ||
    raw === "leistungen" ||
    raw === "mehr"
  ) {
    return raw;
  }
  // Team-/Rollen-Verwaltung ist deaktiviert (ein Zugang pro HV).
  if (raw === "team") {
    return "uebersicht";
  }
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
  bautagebuchByLeadId = {},
  hwErledigtByLeadId = {},
  feedbackBereitByLeadId = {},
  hvFeedbackByLeadId = {},
  auftragKontextByLeadId = {},
  dokumenteByLeadId = {},
  auftragIdByLeadId = {},
  hvAbnahmeByLeadId = {},
  initialVorgaenge,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSection = portalSectionFromParam(searchParams.get("section"));
  const initialItemId = searchParams.get("id");
  const initialVorgangFilter = ((): OrgVorgangFilter | null => {
    const f = searchParams.get("filter");
    if (f === "alle") return "alle";
    if (f === "offen" || f === "freigabe" || f === "aktiv") return "offen";
    if (f === "in_arbeit" || f === "arbeit") return "in_arbeit";
    if (f === "erledigt") return "erledigt";
    return null;
  })();

  const [section, setSection] = useState<OrgSection>(initialSection ?? "uebersicht");
  const [hubOpen, setHubOpen] = useState(false);
  /** Sofortiger Listen-Filter (ohne auf URL/searchParams zu warten). */
  const [vorgangFilterIntent, setVorgangFilterIntent] =
    useState<OrgVorgangFilter | null>(initialVorgangFilter);
  /** Detail-ID sofort nach Klick (vor searchParams). */
  const [pendingDetailId, setPendingDetailId] = useState<string | null>(null);
  const { hold, release, flash, busy: ctxBusy } = usePortalBusy();
  const { refresh: refreshPortal } = usePortalRefresh();
  const navHoldRef = useRef(false);

  function beginNavHold() {
    if (!navHoldRef.current) {
      navHoldRef.current = true;
      hold();
    }
  }

  function endNavHold() {
    if (!navHoldRef.current) return;
    navHoldRef.current = false;
    release();
  }

  /** Notification / Deep-Link: Section aus URL übernehmen (nicht nur Initial-State). */
  useEffect(() => {
    const s = portalSectionFromParam(searchParams.get("section"));
    if (s) setSection(s);
  }, [searchParams]);

  const displayName =
    kunde.org_anzeigename?.trim() || kunde.name?.trim() || "Verwaltung";

  const vorgaengeItems = useMemo(() => {
    if (initialVorgaenge?.length) return initialVorgaenge;
    return buildKundeVorgaenge({
      leads: leads as Parameters<typeof buildKundeVorgaenge>[0]["leads"],
      angebote: angebote as Parameters<typeof buildKundeVorgaenge>[0]["angebote"],
      auftraege,
      hvPortalMode: true,
    });
  }, [initialVorgaenge, leads, angebote, auftraege]);

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
        auftragByLeadId,
        {
          angebote: angebote as HvDashboardAngebotSlice[],
          auftraege: auftraege as HvDashboardAuftragSlice[],
        }
      ),
    [eingang, leads, vorgaengeItems, auftragByLeadId, angebote, auftraege]
  );

  const vorgaengeBadgeCount = filterCounts.offen;

  function flashPageBusy(ms = PORTAL_BUSY_MIN_MS) {
    flash(ms);
  }

  function openVorgangFromNotification(vorgangId: string, href: string) {
    const id = vorgangId.trim();
    beginNavHold();
    flushSync(() => {
      setPendingDetailId(id);
      setSection("vorgaenge");
      setVorgangFilterIntent("alle");
    });
    const target =
      ensurePortalVorgangNotificationHref({
        href,
        vorgangId: id,
      }) ||
      `/portal?section=vorgaenge&filter=alle&id=${encodeURIComponent(id)}`;
    router.push(target);
  }

  /** Vorgang öffnen = zugehörige HV-Benachrichtigungen gelesen. */
  useEffect(() => {
    const id = searchParams.get("id")?.trim()?.replace(/^auftrag:/, "");
    if (!id || section !== "vorgaenge") return;
    void fetch("/api/org/hv-notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vorgangId: id }),
    }).then(() => emitPortalNotificationsChanged());
  }, [searchParams, section]);

  const refresh = () => {
    void refreshPortal();
  };

  function switchSection(next: OrgSection) {
    if (next !== "vorgaenge") {
      setVorgangFilterIntent(null);
      setPendingDetailId(null);
      endNavHold();
    }
    flushSync(() => {
      setSection(next);
    });
    flashPageBusy();
    router.replace(`/portal?section=${next}`, { scroll: false });
  }

  function openVorgaenge(filter?: OrgVorgangFilter) {
    const f: OrgVorgangFilter = filter ?? "alle";
    setPendingDetailId(null);
    endNavHold();
    setVorgangFilterIntent(f);
    flushSync(() => {
      setSection("vorgaenge");
    });
    flashPageBusy();
    router.replace(`/portal?section=vorgaenge&filter=${f}`, { scroll: false });
  }

  /** Dashboard/Suche: Detail öffnen (Filter „alle“, damit der Vorgang sichtbar bleibt). */
  function openVorgangDetail(id: string) {
    const trimmed = id.trim();
    if (!trimmed) return;
    beginNavHold();
    flushSync(() => {
      setPendingDetailId(trimmed);
      setVorgangFilterIntent("alle");
      setSection("vorgaenge");
    });
    router.replace(
      `/portal?section=vorgaenge&filter=alle&id=${encodeURIComponent(trimmed)}`,
      { scroll: false }
    );
  }

  function onVorgangDetailReady() {
    setPendingDetailId(null);
    endNavHold();
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
    const byLeadId = new Map(
      vorgaengeItems.map((item) => [String(item.leadId ?? item.id), item])
    );
    return [...allLeadsForFlow]
      .map((lead) => {
        const flow = resolveLeadPortalFlowStatus({
          lead: lead as Parameters<typeof resolveLeadPortalFlowStatus>[0]["lead"],
          angebot: (angebotByLead.get(String(lead.id)) ??
            null) as Parameters<typeof resolveLeadPortalFlowStatus>[0]["angebot"],
          auftrag: (auftragByLeadMap.get(String(lead.id)) ??
            null) as Parameters<typeof resolveLeadPortalFlowStatus>[0]["auftrag"],
        });
        return {
          lead,
          flow,
          sortDate: new Date(lead.created_at ?? 0).getTime(),
        };
      })
      .sort(compareByNewestCreated)
      .slice(0, PORTAL_DASHBOARD_RECENT_LIMIT)
      .map(({ lead, flow }) => {
        const item = byLeadId.get(String(lead.id));
        // Gleicher Titel wie Liste/Detail; Subline = Anschrift · Melder
        const titel = item?.title?.trim() || "Vorgang";
        const objekt =
          item?.cardSubtitle?.trim() ||
          [
            item?.meldeStrasse,
            [item?.meldePlz, item?.meldeOrt].filter(Boolean).join(" "),
            item?.melderName,
          ]
            .filter(Boolean)
            .join(" · ") ||
          "Objekt";
        return {
          id: lead.id,
          titel,
          objekt: String(objekt),
          flowStatus: flow,
          notfall: leadIstMeldeDirektauftrag(lead),
        };
      });
  }, [allLeadsForFlow, angebote, auftraege, vorgaengeItems]);

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
        brandSubtitle={resolveOrgSubLabel(kunde.org_sub)}
        brandLogoUrl={kunde.org_logo_url}
        brandKuerzel={kunde.org_logo_kuerzel}
        orgPrimaryColor={kunde.org_primary_color}
        brandPrimary={kunde.org_primary_color}
        brandPrimaryDk={kunde.org_primary_color_dk}
        brandSoft={kunde.org_primary_color_soft}
        hideMobileChrome={false}
        activeNavId={section}
        contentKey={`${section}:${searchParams.get("filter") ?? ""}`}
        contentBusy={ctxBusy || Boolean(pendingDetailId)}
        contentBusyTitle={
          pendingDetailId ? "Vorgang wird geladen…" : undefined
        }
        contentBusyBody={
          pendingDetailId
            ? "Einen Moment — wir öffnen die Details."
            : undefined
        }
        onNavChange={(id) => switchSection(id as OrgSection)}
        nav={buildPortalShellNav("kunde_hv", "org", {
          liste: vorgaengeBadgeCount,
        })}
        mobileNav={buildPortalHvMobileNav({
          liste: vorgaengeBadgeCount,
        })}
        footer={displayName}
        createAction={{
          label: portalCreateLabel("kunde_hv"),
          onClick: () => setHubOpen(true),
        }}
        headerUser={{ name: displayName }}
        headerSearch={
          <OrganisationSuche
            onSelect={(id) => openVorgangDetail(id)}
          />
        }
        notifications={
          <>
            <HvNotificationBell
              onOpenVorgang={(id, href) => openVorgangFromNotification(id, href)}
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
                heroImageUrl={PORTAL_HEADER_HERO_SRC}
                onOpenFilter={openVorgaenge}
                onOpenItem={(id) => openVorgangDetail(id)}
              />
            </>
          ) : null}

          {section === "vorgaenge" ? (
            <OrganisationVorgaengeSection
              kunde={kunde}
              eingang={eingang}
              objekte={objekte}
              leads={leads}
              angebote={angebote}
              auftraege={auftraege}
              initialVorgaenge={initialVorgaenge}
              initialFilter={
                vorgangFilterIntent ?? initialVorgangFilter ?? "alle"
              }
              initialSelectedId={initialItemId}
              forceDetailId={pendingDetailId ?? initialItemId}
              onDetailReady={onVorgangDetailReady}
              onRefresh={refresh}
              onFilterChange={(f) => {
                setPendingDetailId(null);
                endNavHold();
                setVorgangFilterIntent(f);
                // Filterwechsel = Liste: alte Detail-id nicht mitschleppen (Race mit closeDetail).
                router.replace(`/portal?section=vorgaenge&filter=${f}`, {
                  scroll: false,
                });
              }}
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
              leads={allLeadsForFlow}
              angebote={angebote}
              auftraege={auftraege}
              orgKennung={kunde.org_kennung}
              kunde={kunde}
              onRefresh={refresh}
              dokumenteByLeadId={dokumenteByLeadId}
              onOpenVorgang={(id) => openVorgangDetail(id)}
            />
          ) : null}

          {section === "mehr" ? (
            <OrganisationMehrScreen
              onOpen={(id) => switchSection(id as OrgSection)}
            />
          ) : null}

          {section === "leistungen" ? (
            <div className="space-y-10">
              <OrganisationServicepaketePanel onRequested={refresh} />
              <OrganisationMieterwechselPanel
                objekte={objekte}
                onRequested={refresh}
              />
              <OrganisationAktiveAbosPanel />
            </div>
          ) : null}

          {section === "profil" ? (
            <OrganisationEinstellungenScreen
              kunde={kunde}
              objektCount={objekte.length}
              onSaved={refresh}
              isAdmin={mitgliedRolle === "admin"}
            />
          ) : null}

          <PortalLegalFooter variant="org" className="mt-8" />
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
