"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { OrgHmBefundPanel } from "@/components/org/OrgHmBefundPanel";
import { PortalUserNotificationBell } from "@/components/portal/PortalUserNotificationBell";
import { PortalVorgangDetail } from "@/components/portal/PortalVorgangDetail";
import { PortalKundePrivatDashboard } from "@/components/portal/PortalKundePrivatDashboard";
import { portalHeaderHeroSrc } from "@/lib/portal2/portal-media";
import {
  paintPortalBusyNow,
  PORTAL_BUSY_MIN_MS,
  usePortalBusy,
} from "@/components/shared/PortalBusyContext";
import { PortalListCard } from "@/components/shared/PortalListCard";
import { PortalEntityDetailLayout } from "@/components/shared/PortalEntityDetailLayout";
import {
  PORTAL_LIST_PAGE_SIZE,
  PortalListPagination,
} from "@/components/shared/PortalListPagination";
import {
  PortalListeEyebrow,
  PortalListeTitle,
} from "@/components/shared/PortalListeChrome";
import { PortalListeFilterBar } from "@/components/shared/PortalListeFilterBar";
import { PortalLegalFooter } from "@/components/shared/PortalLegalFooter";
import { PortalShell } from "@/components/shared/PortalShell";
import { PortalHeaderSearch } from "@/components/shared/PortalHeaderSearch";
import { PortalEmptyState } from "@/components/shared/PortalStateView";
import { buildKundeVorgaenge } from "@/lib/portal/build-kunde-vorgaenge";
import { findKundeVorgangByQueryId } from "@/lib/portal/portal-detail-item";
import { buildKundeVorgangCardRows } from "@/lib/portal/portal-list-mappers";
import {
  compareByNewestCreated,
  compareVorgangListOrder,
  PORTAL_DASHBOARD_RECENT_LIMIT,
  portalFlowSortRank,
} from "@/lib/portal/portal-vorgang-sort";
import { portalListStackClass } from "@/lib/portal2/layout-chrome";
import type { HausmeisterPortalObjekt } from "@/lib/portal/get-hausmeister-portal-data";
import type { MieterHvBrand } from "@/lib/portal/load-mieter-hv-brand";
import {
  countLeadsByPortalFlow,
  resolveLeadPortalFlowStatus,
} from "@/lib/portal2/hv-dashboard";
import {
  buildPrivatDashboardKpis,
  PRIVAT_LISTE_CHIPS,
  privatKpiToListeChip,
  privatListeChipMatches,
  type PrivatDashboardKpiId,
  type PrivatListeChip,
} from "@/lib/portal2/kunde-dashboard";
import { buildPortalShellNav } from "@/lib/portal2/nav-items";
import type { PortalMockStatusId } from "@/lib/portal2/status";
import {
  formatObjektPlzOrt,
  formatObjektStrasse,
  resolveObjektTyp,
} from "@/lib/portal2/objekte";
import { portalDetailStatusPillStyle } from "@/lib/shared/portal-detail-format";

type SectionId = "uebersicht" | "vorgaenge" | "objekte";

type Props = {
  kunde: { name?: string | null; email?: string | null };
  objekte: HausmeisterPortalObjekt[];
  hausverwaltungBrand?: MieterHvBrand | null;
  leads: Parameters<typeof buildKundeVorgaenge>[0]["leads"];
  angebote: Parameters<typeof buildKundeVorgaenge>[0]["angebote"];
  auftraege: Parameters<typeof buildKundeVorgaenge>[0]["auftraege"];
};

function normalizeSection(raw: string | null | undefined): SectionId | null {
  if (!raw) return null;
  if (raw === "uebersicht" || raw === "vorgaenge" || raw === "objekte") return raw;
  if (raw === "anfragen" || raw === "angebote" || raw === "auftraege") {
    return "vorgaenge";
  }
  return null;
}

export function HausmeisterPortalClient({
  kunde,
  objekte,
  hausverwaltungBrand = null,
  leads,
  angebote,
  auftraege,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial =
    normalizeSection(searchParams.get("section")) ?? "uebersicht";

  const [section, setSection] = useState<SectionId>(initial);
  const [listeChip, setListeChip] = useState<PrivatListeChip>("alle");
  const [selectedId, setSelectedId] = useState<string | null>(
    searchParams.get("id")?.trim() || null
  );
  const [listPage, setListPage] = useState(1);
  const [objektDetailId, setObjektDetailId] = useState<string | null>(null);
  const [pageBusy, setPageBusy] = useState(false);
  const [detailOpening, setDetailOpening] = useState(() =>
    Boolean(searchParams.get("id")?.trim())
  );
  const ignoreUrlDetailRef = useRef(false);
  const { hold, release, flash } = usePortalBusy();
  const detailHoldRef = useRef(false);

  function flashPageBusy(ms = PORTAL_BUSY_MIN_MS) {
    flash(ms);
    paintPortalBusyNow(setPageBusy);
    window.setTimeout(() => setPageBusy(false), ms);
  }

  function switchSection(next: SectionId) {
    setObjektDetailId(null);
    setSelectedId(null);
    setSection(next);
    flashPageBusy();
    router.replace(`/portal?section=${next}`, { scroll: false });
  }

  const vorgaengeItems = useMemo(
    () =>
      buildKundeVorgaenge({
        leads,
        angebote,
        auftraege,
        hvPortalMode: true,
        mieterStatusMode: false,
        eigentuemerMode: false,
      }),
    [leads, angebote, auftraege]
  );

  const flowByItemId = useMemo(() => {
    type Lead = (typeof leads)[number];
    type Angebot = (typeof angebote)[number];
    type Auftrag = (typeof auftraege)[number];

    const angebotByLead = new Map<string, Angebot>();
    for (const a of angebote) {
      const lid = (a as { lead_id?: string | null }).lead_id?.trim();
      if (lid && !angebotByLead.has(lid)) angebotByLead.set(lid, a);
    }
    const auftragByLead = new Map<string, Auftrag>();
    for (const a of auftraege) {
      const lid = (a as { lead_id?: string | null }).lead_id?.trim();
      if (lid && !auftragByLead.has(lid)) auftragByLead.set(lid, a);
    }

    const map = new Map<string, PortalMockStatusId>();
    for (const item of vorgaengeItems) {
      const leadId = item.leadId ?? item.id;
      const lead = (leads as Lead[]).find((l) => l.id === leadId);
      if (!lead) {
        map.set(item.id, "gemeldet");
        continue;
      }
      map.set(
        item.id,
        resolveLeadPortalFlowStatus({
          lead: lead as Parameters<
            typeof resolveLeadPortalFlowStatus
          >[0]["lead"],
          angebot: (angebotByLead.get(leadId) ?? null) as Parameters<
            typeof resolveLeadPortalFlowStatus
          >[0]["angebot"],
          auftrag: (auftragByLead.get(leadId) ?? null) as Parameters<
            typeof resolveLeadPortalFlowStatus
          >[0]["auftrag"],
        })
      );
    }
    return map;
  }, [vorgaengeItems, leads, angebote, auftraege]);

  const privatKpis = useMemo(() => {
    const flowCounts = countLeadsByPortalFlow({
      leads: leads as Parameters<typeof countLeadsByPortalFlow>[0]["leads"],
      angebote: angebote as Parameters<
        typeof countLeadsByPortalFlow
      >[0]["angebote"],
      auftraege: auftraege as Parameters<
        typeof countLeadsByPortalFlow
      >[0]["auftraege"],
    });
    return buildPrivatDashboardKpis(flowCounts);
  }, [leads, angebote, auftraege]);

  const filteredItems = useMemo(
    () =>
      vorgaengeItems.filter((item) => {
        const flow = flowByItemId.get(item.id) ?? "gemeldet";
        return privatListeChipMatches(listeChip, flow);
      }),
    [vorgaengeItems, listeChip, flowByItemId]
  );

  const cardRows = useMemo(() => {
    const rows = buildKundeVorgangCardRows(filteredItems, { mockListe: true });
    return [...rows]
      .map((row) => {
        const flow = flowByItemId.get(row.id);
        return {
          ...row,
          statusRank: flow ? portalFlowSortRank(flow) : row.statusRank,
        };
      })
      .sort(compareVorgangListOrder);
  }, [filteredItems, flowByItemId]);

  const pageCount = Math.max(1, Math.ceil(cardRows.length / PORTAL_LIST_PAGE_SIZE));
  const pageRows = cardRows.slice(
    (listPage - 1) * PORTAL_LIST_PAGE_SIZE,
    listPage * PORTAL_LIST_PAGE_SIZE
  );

  const recentItems = useMemo(
    () =>
      [...vorgaengeItems]
        .map((item) => {
          const flow = flowByItemId.get(item.id) ?? ("gemeldet" as const);
          return {
            item,
            flow,
            sortDate: item.date ? new Date(item.date).getTime() : 0,
          };
        })
        .sort(compareByNewestCreated)
        .slice(0, PORTAL_DASHBOARD_RECENT_LIMIT)
        .map(({ item, flow }) => ({
          id: item.id,
          titel: item.title,
          objekt: item.cardSubtitle ?? item.plz ?? "—",
          flowStatus: flow,
          notfall: false,
        })),
    [vorgaengeItems, flowByItemId]
  );

  const selectedItem = useMemo(
    () =>
      selectedId
        ? findKundeVorgangByQueryId(vorgaengeItems, selectedId)
        : null,
    [vorgaengeItems, selectedId]
  );

  const selectedLead = useMemo(() => {
    if (!selectedItem) return null;
    const lid = String(selectedItem.leadId ?? selectedItem.id);
    return leads.find((l) => String(l.id) === lid) ?? null;
  }, [selectedItem, leads]);

  const hvStatus = String(
    (selectedLead as { hv_meldung_status?: string } | null)?.hv_meldung_status ??
      ""
  )
    .trim()
    .toLowerCase();

  function openVorgangById(id: string) {
    ignoreUrlDetailRef.current = false;
    setDetailOpening(true);
    setSelectedId(id);
    if (!detailHoldRef.current) {
      hold();
      detailHoldRef.current = true;
    }
    router.replace(`/portal?section=vorgaenge&id=${encodeURIComponent(id)}`, {
      scroll: false,
    });
  }

  useEffect(() => {
    if (!detailOpening || !selectedId || !selectedItem) return;
    const t = window.setTimeout(() => {
      setDetailOpening(false);
      if (detailHoldRef.current) {
        release();
        detailHoldRef.current = false;
      }
    }, PORTAL_BUSY_MIN_MS);
    return () => window.clearTimeout(t);
  }, [detailOpening, selectedId, selectedItem, release]);

  const hvBrand = hausverwaltungBrand;
  const brandTitle = hvBrand?.name?.trim() || "Verwaltung";
  const activeObjekt = objektDetailId
    ? objekte.find((o) => o.id === objektDetailId) ?? null
    : null;

  return (
    <>
      <PortalShell
        variant="kunde"
        brandTitle={brandTitle}
        brandSubtitle={kunde.name?.trim() || "Hausmeister"}
        brandLogoUrl={hvBrand?.logoUrl}
        brandKuerzel={hvBrand?.logoKuerzel ?? null}
        brandPrimary={hvBrand?.primary}
        brandPrimaryDk={hvBrand?.primaryDk}
        brandSoft={hvBrand?.soft}
        sidebarOwner={brandTitle}
        contentFullBleed={
          section === "uebersicht" ||
          Boolean(selectedId) ||
          Boolean(objektDetailId)
        }
        activeNavId={section}
        contentKey={`${section}:${objektDetailId ?? ""}`}
        contentBusy={pageBusy || detailOpening}
        onNavChange={(id) => switchSection(id as SectionId)}
        nav={buildPortalShellNav("eigentuemer", "eigentuemer")}
        headerSearch={
          <PortalHeaderSearch onSubmit={() => switchSection("vorgaenge")} />
        }
        notifications={
          <PortalUserNotificationBell
            role="kunde"
            onOpenVorgang={(id) => openVorgangById(id)}
          />
        }
        headerRoleBadge={
          <form action="/portal/auth/signout" method="post">
            <button type="submit" className="btn-pill-outline portal-btn-compact">
              Abmelden
            </button>
          </form>
        }
      >
        {section === "uebersicht" ? (
          <PortalKundePrivatDashboard
            hello={`Hallo ${kunde.name?.trim().split(/\s+/)[0] || "dort"}`}
            profileName={kunde.name?.trim() || "Hausmeister"}
            roleLabel="Hausmeister"
            kundeTyp="privat"
            kpis={privatKpis}
            recent={recentItems}
            heroImageUrl={portalHeaderHeroSrc("mieter")}
            onOpenAll={() => {
              setListeChip("alle");
              switchSection("vorgaenge");
            }}
            onKpiClick={(kpi: PrivatDashboardKpiId) => {
              setListeChip(privatKpiToListeChip(kpi));
              switchSection("vorgaenge");
            }}
            onOpenItem={(id: string) => openVorgangById(id)}
          />
        ) : null}

        {section === "vorgaenge" ? (
          selectedItem && selectedId ? (
            <div className="-mx-4 -mt-4 min-w-0 space-y-4 lg:-mx-6 lg:-mt-5">
              <PortalVorgangDetail
                item={selectedItem}
                privatkunde
                showHvAbnahme
                mieterStatusMode={false}
                flowStatusOverride={
                  flowByItemId.get(selectedItem.id) ?? "gemeldet"
                }
                onBack={() => {
                  ignoreUrlDetailRef.current = true;
                  flushSync(() => setSelectedId(null));
                  flashPageBusy();
                  router.replace("/portal?section=vorgaenge", { scroll: false });
                }}
              />
              {hvStatus === "hm_pruefung" || hvStatus === "hm_erledigt" ? (
                <div className="px-4 lg:px-6">
                  <OrgHmBefundPanel
                    leadId={String(selectedItem.leadId ?? selectedItem.id)}
                    hvMeldungStatus={hvStatus}
                    readOnly={hvStatus === "hm_erledigt"}
                    hideOrgOnlyActions
                    onUpdated={() => router.refresh()}
                  />
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex min-w-0 flex-col">
              <div className="px-0.5 pb-1">
                <PortalListeEyebrow>Hausmeister</PortalListeEyebrow>
                <PortalListeTitle>Meine Vorgänge</PortalListeTitle>
              </div>
              <PortalListeFilterBar
                value={listeChip}
                onChange={(id) => {
                  setListeChip(id);
                  setListPage(1);
                }}
                sheetTitle="Liste"
                options={PRIVAT_LISTE_CHIPS.map((chip) => ({
                  id: chip.id,
                  label: chip.label,
                }))}
              />
              {pageRows.length === 0 ? (
                <PortalEmptyState role="eigentuemer" compact canCreate={false} />
              ) : (
                <div className={portalListStackClass("responsive")}>
                  {pageRows.map((row) => (
                    <PortalListCard
                      key={row.id}
                      variant="responsive"
                      selected={false}
                      title={row.title}
                      subtitle={row.subtitle}
                      statusLabel={row.statusLabel}
                      statusPillClass=""
                      statusPillStyle={portalDetailStatusPillStyle(
                        row.statusPillKey as PortalMockStatusId
                      )}
                      accent={row.accent}
                      meta={row.meta}
                      showChevron
                      onClick={() => openVorgangById(row.id)}
                    />
                  ))}
                  <PortalListPagination
                    totalItems={cardRows.length}
                    itemLabel="Vorgänge"
                    currentPage={listPage}
                    totalPages={pageCount}
                    onPageChange={setListPage}
                  />
                </div>
              )}
            </div>
          )
        ) : null}

        {section === "objekte" ? (
          <div className="space-y-4">
            {activeObjekt ? (
              <div className="-mx-4 -mt-4 min-w-0 pb-4 lg:-mx-6 lg:-mt-5">
                <PortalEntityDetailLayout
                  coverUrl={activeObjekt.cover_url}
                  onBack={() => setObjektDetailId(null)}
                  backLabel="← Objekte"
                  title={activeObjekt.titel}
                  metaLine={[
                    resolveObjektTyp(activeObjekt),
                    formatObjektPlzOrt(activeObjekt) || null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  tabs={[{ id: "stammdaten", label: "Stammdaten" }]}
                  activeTab="stammdaten"
                  onTabChange={() => {}}
                  tabsNavLabel="Objekt-Abschnitte"
                >
                  <dl className="portal-surface space-y-3 p-4">
                    <div>
                      <dt className="portal-text-meta text-text-tertiary">
                        Adresse
                      </dt>
                      <dd className="portal-text-body font-medium">
                        {formatObjektStrasse(activeObjekt) || "—"}
                      </dd>
                    </div>
                  </dl>
                </PortalEntityDetailLayout>
              </div>
            ) : (
              <>
                <PortalListeTitle>Meine Objekte</PortalListeTitle>
                {objekte.length === 0 ? (
                  <div className="portal-surface p-6 text-center portal-text-body text-text-secondary">
                    Noch keine Objekte zugewiesen.
                  </div>
                ) : (
                  <div className="portal-list-panel portal-list-rows">
                    {objekte.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        className="w-full px-4 py-3.5 text-left transition-colors hover:bg-[#f7f8fa]"
                        onClick={() => setObjektDetailId(o.id)}
                      >
                        <p className="portal-text-body font-semibold text-text-primary">
                          {o.titel}
                        </p>
                        <p className="portal-text-meta mt-1 text-text-secondary">
                          {formatObjektStrasse(o) || "—"}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ) : null}

        <PortalLegalFooter variant="kunde" showServiceBy />
      </PortalShell>
    </>
  );
}
