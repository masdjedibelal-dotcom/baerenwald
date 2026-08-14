"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { PortalUserNotificationBell } from "@/components/portal/PortalUserNotificationBell";
import { PortalVorgangDetail } from "@/components/portal/PortalVorgangDetail";
import { PortalKundePrivatDashboard } from "@/components/portal/PortalKundePrivatDashboard";
import { portalHeaderHeroSrc } from "@/lib/portal2/portal-media";
import { emitPortalNotificationsChanged } from "@/lib/portal2/notif-refresh";
import {
  paintPortalBusyNow,
  PORTAL_BUSY_MIN_MS,
  usePortalBusy,
} from "@/components/shared/PortalBusyContext";
import { PortalContentBusy } from "@/components/shared/PortalContentBusy";
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
import type { EigentuemerPortalObjekt } from "@/lib/portal/get-eigentuemer-portal-data";
import {
  countLeadsByPortalFlow,
  resolveLeadPortalFlowStatus,
} from "@/lib/portal2/hv-dashboard";
import {
  buildPrivatDashboardKpis,
  PRIVAT_LISTE_CHIPS,
  privatKpiToListeChip,
  privatListeChipMatches,
  type PrivatListeChip,
} from "@/lib/portal2/kunde-dashboard";
import {
  EIGENTUEMER_DASHBOARD_ROLE,
  EIGENTUEMER_PAGE_HEAD,
} from "@/lib/portal2/eigentuemer";
import { buildPortalShellNav } from "@/lib/portal2/nav-items";
import type { PortalMockStatusId } from "@/lib/portal2/status";
import {
  formatObjektPlzOrt,
  formatObjektStrasse,
  formatObjektTypLine,
  parseEinheitenCount,
} from "@/lib/portal2/objekte";
import { portalDetailStatusPillStyle } from "@/lib/shared/portal-detail-format";

type SectionId = "uebersicht" | "vorgaenge" | "objekte";

type Props = {
  kunde: {
    name?: string | null;
    email?: string | null;
    freigabe_schwelle_eur?: number | null;
    eigentuemer_freigabe_schwelle_eur?: number | null;
  };
  /** @deprecated Freigabe-Schwelle — Eigentümer gibt nichts mehr frei. */
  schwelleEur?: number;
  objekte: EigentuemerPortalObjekt[];
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
 * D8 Eigentümer-Portal — Dashboard · Vorgänge · Objekte.
 * Nur Status-Ansicht (keine Freigabe, kein Create, keine Aktionen).
 */
export function EigentuemerPortalClient({
  kunde,
  objekte,
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
  const detailOpeningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const ignoreUrlDetailRef = useRef(false);
  const pendingDetailIdRef = useRef<string | null>(null);

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
    if (detailOpeningTimerRef.current) {
      clearTimeout(detailOpeningTimerRef.current);
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

  const switchSection = (id: SectionId) => {
    ignoreUrlDetailRef.current = true;
    pendingDetailIdRef.current = null;
    setDetailOpening(false);
    flushSync(() => {
      setSection(id);
      setObjektDetailId(null);
      setSelectedId(null);
    });
    flashPageBusy();
    router.replace(`/portal?section=${id}`, { scroll: false });
  };

  const vorgaengeItems = useMemo(
    () =>
      buildKundeVorgaenge({
        leads,
        angebote,
        auftraege,
        hvPortalMode: true,
        mieterStatusMode: false,
        eigentuemerMode: true,
      }),
    [leads, angebote, auftraege]
  );

  function openVorgangById(id: string) {
    const matched = findKundeVorgangByQueryId(vorgaengeItems, id);
    const nextId = matched?.id ?? id.trim();
    if (!nextId) return;
    ignoreUrlDetailRef.current = false;
    pendingDetailIdRef.current = nextId;
    beginDetailOpening();
    flushSync(() => {
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
      // Klick schon unterwegs, URL noch ohne id — Selection behalten.
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
      return;
    }
    setSelectedId(id);
  }, [searchParams, vorgaengeItems]);

  /** Vorgang öffnen = zugehörige Benachrichtigungen gelesen. */
  useEffect(() => {
    if (!selectedId) return;
    const matched = findKundeVorgangByQueryId(vorgaengeItems, selectedId);
    const refs = [selectedId.replace(/^auftrag:/, "")];
    if (matched?.id && matched.id !== refs[0]) refs.push(matched.id);
    void fetch("/api/portal/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vorgangRef: refs }),
    }).then(() => emitPortalNotificationsChanged());
  }, [selectedId, vorgaengeItems]);

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
          lead: lead as Parameters<typeof resolveLeadPortalFlowStatus>[0]["lead"],
          angebot: (angebotByLead.get(leadId) ??
            null) as Parameters<
            typeof resolveLeadPortalFlowStatus
          >[0]["angebot"],
          auftrag: (auftragByLead.get(leadId) ??
            null) as Parameters<
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
      angebote: angebote as Parameters<typeof countLeadsByPortalFlow>[0]["angebote"],
      auftraege: auftraege as Parameters<typeof countLeadsByPortalFlow>[0]["auftraege"],
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

  const selectedItem = selectedId
    ? findKundeVorgangByQueryId(vorgaengeItems, selectedId)
    : null;
  const selectedLeadId = selectedItem
    ? selectedItem.leadId ?? selectedItem.id
    : null;

  useEffect(() => {
    if (!detailOpening || !selectedId || !selectedItem) return;
    const t = window.setTimeout(() => {
      endDetailOpening();
    }, PORTAL_BUSY_MIN_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailOpening, selectedId, selectedItem]);

  const helloName =
    kunde.name?.trim().split(/\s+/)[0] ||
    kunde.email?.split("@")[0] ||
    "dort";

  const activeObjekt = objektDetailId
    ? objekte.find((o) => o.id === objektDetailId) ?? null
    : null;

  return (
    <>
    <PortalShell
      variant="kunde"
      brandTitle="MeinBärenwald"
      brandSubtitle={kunde.name?.trim() || EIGENTUEMER_PAGE_HEAD}
      brandKuerzel="B"
      sidebarOwner={kunde.name?.trim() || EIGENTUEMER_DASHBOARD_ROLE}
      hideMobileChrome={false}
      activeNavId={section}
      contentKey={`${section}:${objektDetailId ?? ""}`}
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
      headerUser={{ name: kunde.name?.trim() || EIGENTUEMER_DASHBOARD_ROLE }}
      headerSearch={
        <PortalHeaderSearch
          onSubmit={() => {
            switchSection("vorgaenge");
          }}
        />
      }
      headerRoleBadge={
        <span className="rounded-full bg-muted px-2 py-0.5 portal-text-meta font-semibold text-text-secondary">
          {EIGENTUEMER_DASHBOARD_ROLE}
        </span>
      }
      notifications={
        <>
          <PortalUserNotificationBell
            role="eigentuemer"
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
          <form action="/portal/auth/signout" method="post">
            <button type="submit" className="btn-pill-outline portal-btn-compact">
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
          kundeTyp="privat"
          roleLabel={EIGENTUEMER_DASHBOARD_ROLE}
          kpis={privatKpis}
          recent={recentItems}
          heroImageUrl={portalHeaderHeroSrc("eigentuemer")}
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
          onKpiClick={(id) => {
            setListeChip(privatKpiToListeChip(id));
            switchSection("vorgaenge");
          }}
          onOpenItem={(id) => openVorgangById(id)}
        />
      ) : null}

      {section === "vorgaenge" ? (
        selectedId && (detailOpening || !selectedItem) ? (
          <PortalContentBusy
            title="Vorgang wird geladen…"
            body="Einen Moment — wir öffnen die Details."
          />
        ) : selectedItem && selectedLeadId ? (
          <div className="-mx-4 -mt-4 min-w-0 space-y-4 lg:-mx-6 lg:-mt-5">
            <PortalVorgangDetail
              item={selectedItem}
              privatkunde
              showHvAbnahme
              mieterStatusMode
              flowStatusOverride={
                flowByItemId.get(selectedItem.id) ?? "gemeldet"
              }
              onBack={() => {
                ignoreUrlDetailRef.current = true;
                pendingDetailIdRef.current = null;
                setDetailOpening(false);
                flushSync(() => {
                  setSelectedId(null);
                });
                flashPageBusy();
                router.replace("/portal?section=vorgaenge", {
                  scroll: false,
                });
              }}
            />
          </div>
        ) : (
          <div className="flex min-w-0 flex-col">
            <div className="px-0.5 pb-1">
              <PortalListeEyebrow>Eigentümer</PortalListeEyebrow>
              <PortalListeTitle>Meine Wohnung</PortalListeTitle>
              <p className="portal-text-body mt-1 text-text-secondary">
                Status Ihrer Vorgänge — nur Ansicht, keine Freigabe nötig.
              </p>
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
                    statusPillStyle={portalDetailStatusPillStyle(row.statusPillKey)}
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
                  formatObjektTypLine(activeObjekt),
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
                    <dt className="portal-text-meta text-text-tertiary">Adresse</dt>
                    <dd className="portal-text-body font-medium">
                      {formatObjektStrasse(activeObjekt) || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="portal-text-meta text-text-tertiary">
                      Einheiten
                    </dt>
                    <dd className="portal-text-body font-medium">
                      {parseEinheitenCount(activeObjekt.einheiten_hinweis) || "—"}
                    </dd>
                  </div>
                </dl>
                <p className="portal-text-meta mt-3 text-text-tertiary">
                  Lesesicht — Änderungen nimmt die Verwaltung vor.
                </p>
              </PortalEntityDetailLayout>
            </div>
          ) : (
            <>
              <div className="space-y-0.5">
                <PortalListeTitle>Objekte</PortalListeTitle>
                <p className="portal-text-body text-text-secondary">
                  Ihre zugeordneten Gebäude (nur Lesen).
                </p>
              </div>
              {objekte.length === 0 ? (
                <div className="portal-surface p-6 text-center portal-text-body text-text-secondary">
                  Noch keine Objekte zugeordnet. Die Verwaltung legt die
                  Zuordnung fest.
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
                        {formatObjektPlzOrt(o) !== "—"
                          ? ` · ${formatObjektPlzOrt(o)}`
                          : ""}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ) : null}

      <PortalLegalFooter variant="kunde" />
    </PortalShell>
    </>
  );
}
