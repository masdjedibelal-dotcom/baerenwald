"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { PortalUserNotificationBell } from "@/components/portal/PortalUserNotificationBell";
import { PortalVorgangDetail } from "@/components/portal/PortalVorgangDetail";
import { PortalKundePrivatDashboard } from "@/components/portal/PortalKundePrivatDashboard";
import {
  portalHeaderHeroSrc,
} from "@/lib/portal2/portal-media";
import {
  paintPortalBusyNow,
  PORTAL_BUSY_MIN_MS,
  usePortalBusy,
} from "@/components/shared/PortalBusyContext";
import { PortalContentBusy } from "@/components/shared/PortalContentBusy";
import { PortalListCard } from "@/components/shared/PortalListCard";
import { OrganisationObjektCover } from "@/components/org/OrganisationObjektCover";
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
import { PortalRoleBadge } from "@/components/shared/PortalRoleBadge";
import { PortalShell } from "@/components/shared/PortalShell";
import { PortalHeaderSearch } from "@/components/shared/PortalHeaderSearch";
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
import {
  HAUSMEISTER_DASHBOARD_ROLE,
  HAUSMEISTER_LISTE_EMPTY,
  HAUSMEISTER_LISTE_TITLE,
  HAUSMEISTER_OBJEKTE_EMPTY,
  HAUSMEISTER_OBJEKTE_TITLE,
  HAUSMEISTER_PAGE_HEAD,
} from "@/lib/portal2/hausmeister";
import { buildPortalShellNav } from "@/lib/portal2/nav-items";
import type { PortalMockStatusId } from "@/lib/portal2/status";
import {
  formatObjektAdresse,
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

/**
 * Hausmeister-Portal — Dashboard · Vorgänge · Objekte (Parity zu Eigentümer).
 */
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
  const pendingDetailIdRef = useRef<string | null>(null);
  const detailOpeningTimerRef = useRef<number | null>(null);
  const { hold, release, flash } = usePortalBusy();
  const detailHoldRef = useRef(false);

  function flashPageBusy(ms = PORTAL_BUSY_MIN_MS) {
    flash(ms);
    paintPortalBusyNow(setPageBusy);
    window.setTimeout(() => setPageBusy(false), ms);
  }

  function beginDetailOpening() {
    if (!detailHoldRef.current) {
      detailHoldRef.current = true;
      hold();
    }
    paintPortalBusyNow(setDetailOpening, setPageBusy);
    if (detailOpeningTimerRef.current != null) {
      window.clearTimeout(detailOpeningTimerRef.current);
      detailOpeningTimerRef.current = null;
    }
  }

  function endDetailOpening() {
    setDetailOpening(false);
    setPageBusy(false);
    if (detailHoldRef.current) {
      detailHoldRef.current = false;
      release();
    }
  }

  useEffect(() => {
    const s = normalizeSection(searchParams.get("section"));
    if (s) setSection(s);
  }, [searchParams]);

  function switchSection(next: SectionId) {
    ignoreUrlDetailRef.current = true;
    pendingDetailIdRef.current = null;
    setDetailOpening(false);
    flushSync(() => {
      setObjektDetailId(null);
      setSelectedId(null);
      setListPage(1);
      setSection(next);
    });
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

  function openVorgangById(id: string) {
    const matched = findKundeVorgangByQueryId(vorgaengeItems, id);
    const nextId = matched?.id ?? id.trim();
    if (!nextId) return;
    ignoreUrlDetailRef.current = false;
    pendingDetailIdRef.current = nextId;
    beginDetailOpening();
    flushSync(() => {
      setObjektDetailId(null);
      setSection("vorgaenge");
      setSelectedId(nextId);
    });
    router.replace(
      `/portal?section=vorgaenge&id=${encodeURIComponent(nextId)}`,
      { scroll: false }
    );
  }

  useEffect(() => {
    const id = searchParams.get("id")?.trim() || null;
    if (ignoreUrlDetailRef.current) {
      if (!id) {
        ignoreUrlDetailRef.current = false;
        pendingDetailIdRef.current = null;
        setSelectedId(null);
      }
      return;
    }
    if (!id) {
      if (pendingDetailIdRef.current) return;
      setSelectedId(null);
      return;
    }
    const pending = pendingDetailIdRef.current;
    if (pending && pending !== id) {
      const matchedPending = findKundeVorgangByQueryId(vorgaengeItems, pending);
      const matchedUrl = findKundeVorgangByQueryId(vorgaengeItems, id);
      const pendingCanon = matchedPending?.id ?? pending;
      const urlCanon = matchedUrl?.id ?? id;
      if (pendingCanon !== urlCanon) return;
    }
    const matched = findKundeVorgangByQueryId(vorgaengeItems, id);
    if (matched) {
      if (pending && (pending === matched.id || pending === id)) {
        pendingDetailIdRef.current = null;
      }
      setSelectedId(matched.id);
      setSection("vorgaenge");
    } else {
      setSelectedId(id);
      setSection("vorgaenge");
    }
  }, [searchParams, vorgaengeItems]);

  useEffect(() => {
    if (!detailOpening || !selectedId || !selectedItem) return;
    const t = window.setTimeout(() => {
      endDetailOpening();
    }, PORTAL_BUSY_MIN_MS);
    detailOpeningTimerRef.current = t;
    return () => {
      window.clearTimeout(t);
      if (detailOpeningTimerRef.current === t) {
        detailOpeningTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailOpening, selectedId, selectedItem]);

  /** Nach HM-Abschluss (z. B. Angebot einholen) fällt der Lead aus dem Filter — Detail-URL sonst Endlos-Laden. */
  useEffect(() => {
    if (!selectedId || selectedItem) return;
    const t = window.setTimeout(() => {
      if (findKundeVorgangByQueryId(vorgaengeItems, selectedId)) return;
      endDetailOpening();
      ignoreUrlDetailRef.current = true;
      pendingDetailIdRef.current = null;
      flushSync(() => setSelectedId(null));
      router.replace("/portal?section=vorgaenge", { scroll: false });
    }, 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selectedItem, vorgaengeItems]);

  const helloName =
    kunde.name?.trim().split(/\s+/)[0] ||
    kunde.email?.split("@")[0] ||
    "dort";

  const hvBrand = hausverwaltungBrand;
  const brandTitle = hvBrand?.name?.trim() || "Verwaltung";
  const brandSubtitle =
    hvBrand?.sub?.trim() || kunde.name?.trim() || HAUSMEISTER_PAGE_HEAD;
  const activeObjekt = objektDetailId
    ? objekte.find((o) => o.id === objektDetailId) ?? null
    : null;

  return (
    <>
      <PortalShell
        variant="kunde"
        brandTitle={brandTitle}
        brandSubtitle={brandSubtitle}
        brandLogoUrl={hvBrand?.logoUrl}
        brandKuerzel={hvBrand?.logoKuerzel ?? null}
        brandPrimary={hvBrand?.primary}
        brandPrimaryDk={hvBrand?.primaryDk}
        brandSoft={hvBrand?.soft}
        sidebarOwner={brandTitle}
        hideMobileChrome={false}
        contentFullBleed={
          section === "uebersicht" ||
          Boolean(selectedId) ||
          Boolean(objektDetailId)
        }
        activeNavId={section}
        contentKey={`${section}:${objektDetailId ?? ""}:${selectedId ?? ""}`}
        contentBusy={pageBusy || detailOpening}
        contentBusyTitle={
          detailOpening ? "Vorgang wird geladen…" : undefined
        }
        contentBusyBody={
          detailOpening
            ? "Einen Moment — wir öffnen die Details."
            : undefined
        }
        onNavChange={(id) => switchSection(id as SectionId)}
        nav={buildPortalShellNav("eigentuemer", "eigentuemer")}
        headerSearch={
          <PortalHeaderSearch onSubmit={() => switchSection("vorgaenge")} />
        }
        notifications={
          <PortalUserNotificationBell
            role="hausmeister"
            allHref="/portal?section=vorgaenge"
            onOpenVorgang={(id, href) => {
              const matched = findKundeVorgangByQueryId(vorgaengeItems, id);
              const nextId = matched?.id ?? id;
              ignoreUrlDetailRef.current = false;
              pendingDetailIdRef.current = nextId;
              beginDetailOpening();
              flushSync(() => {
                setSection("vorgaenge");
                setSelectedId(nextId);
              });
              router.push(href);
            }}
          />
        }
        headerRoleBadge={
          <>
            <PortalRoleBadge role="hausmeister" />
            <form action="/portal/auth/signout" method="post">
              <button
                type="submit"
                className="btn-pill-outline portal-btn-compact"
              >
                Abmelden
              </button>
            </form>
          </>
        }
      >
        {section === "uebersicht" ? (
          <PortalKundePrivatDashboard
            hello={`Hallo ${helloName}`}
            profileName={kunde.name?.trim() || helloName}
            roleLabel={HAUSMEISTER_DASHBOARD_ROLE}
            kundeTyp="privat"
            kpis={privatKpis}
            recent={recentItems}
            heroImageUrl={portalHeaderHeroSrc("hausmeister")}
            onOpenAll={() => {
              setListeChip("alle");
              flushSync(() => {
                setSection("vorgaenge");
                setSelectedId(null);
              });
              flashPageBusy();
              router.replace("/portal?section=vorgaenge&filter=alle", {
                scroll: false,
              });
            }}
            onKpiClick={(kpi: PrivatDashboardKpiId) => {
              setListeChip(privatKpiToListeChip(kpi));
              switchSection("vorgaenge");
            }}
            onOpenItem={(id: string) => openVorgangById(id)}
          />
        ) : null}

        {section === "vorgaenge" ? (
          selectedId && (detailOpening || !selectedItem) ? (
            <PortalContentBusy
              title="Vorgang wird geladen…"
              body="Einen Moment — wir öffnen die Details."
            />
          ) : selectedItem && selectedId ? (
            <div className="-mx-4 -mt-4 min-w-0 space-y-4 lg:-mx-6 lg:-mt-5">
              <PortalVorgangDetail
                item={selectedItem}
                privatkunde
                showHvAbnahme
                hausmeisterActor
                mieterStatusMode={false}
                flowStatusOverride={
                  flowByItemId.get(selectedItem.id) ?? "gemeldet"
                }
                onBack={() => {
                  ignoreUrlDetailRef.current = true;
                  pendingDetailIdRef.current = null;
                  setDetailOpening(false);
                  flushSync(() => setSelectedId(null));
                  flashPageBusy();
                  router.replace("/portal?section=vorgaenge", { scroll: false });
                }}
              />
            </div>
          ) : (
            <div className="flex min-w-0 flex-col">
              <div className="px-0.5 pb-1">
                <PortalListeEyebrow>{HAUSMEISTER_DASHBOARD_ROLE}</PortalListeEyebrow>
                <PortalListeTitle>{HAUSMEISTER_LISTE_TITLE}</PortalListeTitle>
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
                <div className="rounded-2xl border border-border-light bg-white px-4 py-8 text-center">
                  <p className="portal-text-body text-text-secondary">
                    {HAUSMEISTER_LISTE_EMPTY}
                  </p>
                </div>
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
                  onBack={() => {
                    setObjektDetailId(null);
                    flashPageBusy();
                  }}
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
                        {formatObjektAdresse(activeObjekt) ||
                          formatObjektStrasse(activeObjekt) ||
                          "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="portal-text-meta text-text-tertiary">
                        Objekttyp
                      </dt>
                      <dd className="portal-text-body font-medium">
                        {resolveObjektTyp(activeObjekt)}
                      </dd>
                    </div>
                  </dl>
                </PortalEntityDetailLayout>
              </div>
            ) : (
              <>
                <div className="px-0.5 pb-1">
                  <PortalListeEyebrow>{HAUSMEISTER_DASHBOARD_ROLE}</PortalListeEyebrow>
                  <PortalListeTitle>{HAUSMEISTER_OBJEKTE_TITLE}</PortalListeTitle>
                </div>
                {objekte.length === 0 ? (
                  <div className="portal-surface p-6 text-center portal-text-body text-text-secondary">
                    {HAUSMEISTER_OBJEKTE_EMPTY}
                  </div>
                ) : (
                  <div className={portalListStackClass("responsive")}>
                    {objekte.map((o) => (
                      <PortalListCard
                        key={o.id}
                        variant="responsive"
                        selected={false}
                        accent="auftrag"
                        showLeftAccent={false}
                        media={
                          <OrganisationObjektCover
                            objektId={o.id}
                            coverUrl={o.cover_url}
                            variant="card"
                            className="!rounded-none"
                            canUpload={false}
                          />
                        }
                        title={o.titel}
                        subtitle={formatObjektAdresse(o) || "—"}
                        meta={[
                          {
                            text: resolveObjektTyp(o),
                            icon: "map-pin" as const,
                          },
                        ]}
                        statusLabel="Objekt"
                        statusPillClass="bg-[#eceef0] text-text-tertiary"
                        showChevron
                        onClick={() => {
                          flashPageBusy();
                          setObjektDetailId(o.id);
                        }}
                      />
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
