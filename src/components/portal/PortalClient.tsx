"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import "@/components/onboarding/onboarding.css";
import { PortalBaerenwaldGpt } from "@/components/portal/PortalBaerenwaldGpt";
import { PortalCreateFunnelModal } from "@/components/portal/PortalCreateFunnelModal";
import { PortalEinstellungenPrivat } from "@/components/portal/PortalEinstellungenPrivat";
import { PortalKundePrivatDashboard } from "@/components/portal/PortalKundePrivatDashboard";
import { PORTAL_HEADER_HERO_SRC } from "@/lib/portal2/portal-media";
import { PortalUserNotificationBell } from "@/components/portal/PortalUserNotificationBell";
import { PortalVorgangDetail } from "@/components/portal/PortalVorgangDetail";
import { PortalLegalFooter } from "@/components/shared/PortalLegalFooter";
import { PortalShell } from "@/components/shared/PortalShell";
import { PortalEmptyState } from "@/components/shared/PortalStateView";
import { PortalListCard } from "@/components/shared/PortalListCard";
import {
  PORTAL_LIST_PAGE_SIZE,
  PortalListPagination,
} from "@/components/shared/PortalListPagination";
import { isOnboardingCompleted } from "@/lib/onboarding/storage";
import { PORTAL_ONBOARDING_SLIDES } from "@/lib/onboarding/portal-slides";
import { buildKundeVorgaenge } from "@/lib/portal/build-kunde-vorgaenge";
import {
  countKundeVorgaengeFilter,
  countKundeVorgaengeNeedsAction,
  filterKundeVorgaenge,
  type KundeVorgangFilter,
} from "@/lib/portal/kunde-vorgang-filter";
import {
  buildKundeVorgangCardRows,
  type PortalCardRow,
} from "@/lib/portal/portal-list-mappers";
import { portalCreateLabel } from "@/lib/portal2/create";
import { inferFlowFromKundeItem } from "@/lib/portal2/hv-detail-adapters";
import {
  buildPrivatDashboardKpis,
  PRIVAT_LISTE_CHIPS,
  privatListeChipMatches,
  type PrivatListeChip,
} from "@/lib/portal2/kunde-dashboard";
import {
  portalKundeDashboardHello,
  portalKundeListeTitle,
  portalKundeTypRoleLabel,
  portalNavRoleForKundeTyp,
  resolvePortalKundeTyp,
  type PortalKundeTyp,
} from "@/lib/portal2/kunde-typ";
import {
  countLeadsByPortalFlow,
} from "@/lib/portal2/hv-dashboard";
import { buildPortalShellNav } from "@/lib/portal2/nav-items";
import { cn } from "@/lib/utils";
import { portalDetailStatusPillClass } from "@/lib/shared/portal-detail-format";

type PortalKunde = {
  name?: string | null;
  email?: string | null;
  freigabe_schwelle_eur?: number | null;
  portal_modus?: string | null;
  typ?: string | null;
};

type PortalLead = Parameters<typeof buildKundeVorgaenge>[0]["leads"][number];
type PortalAngebot = Parameters<typeof buildKundeVorgaenge>[0]["angebote"][number];
type PortalAuftrag = Parameters<typeof buildKundeVorgaenge>[0]["auftraege"][number];

type SectionId = "uebersicht" | "vorgaenge" | "gpt" | "profil";

const VORGANG_FILTER_LABELS: Record<KundeVorgangFilter, string> = {
  aktiv: "Aktiv",
  erledigt: "Erledigt",
};

function normalizeSectionFromUrl(raw: string | undefined): SectionId | null {
  if (!raw) return null;
  if (
    raw === "anfragen" ||
    raw === "angebote" ||
    raw === "auftraege" ||
    raw === "vorgaenge"
  ) {
    return "vorgaenge";
  }
  if (raw === "uebersicht" || raw === "gpt" || raw === "profil") return raw;
  return null;
}

function VorgangListFilterBar({
  filter,
  onFilterChange,
  counts,
}: {
  filter: KundeVorgangFilter;
  onFilterChange: (filter: KundeVorgangFilter) => void;
  counts: Record<KundeVorgangFilter, number>;
}) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-border-default px-3 py-3 sm:px-4">
      {(["aktiv", "erledigt"] as const).map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onFilterChange(id)}
          className={cn(
            "rounded-full px-3 py-1.5 portal-text-meta font-semibold",
            filter === id
              ? "bg-accent-light text-accent"
              : "bg-muted text-text-secondary"
          )}
        >
          {VORGANG_FILTER_LABELS[id]}
          <span className="ml-1.5 text-text-tertiary">({counts[id]})</span>
        </button>
      ))}
    </div>
  );
}

export function PortalClient({
  kunde,
  leads,
  angebote,
  auftraege,
  layout = "default",
  activeSection,
  showAnlassBadge = false,
  hideFilterBar = false,
  controlledVorgangFilter,
  onVorgangFilterChange,
  hvPortalMode = false,
  kundeTyp: kundeTypProp,
  mieterFeedbackByLeadId = {},
  hwErledigtByLeadId = {},
  hvFeedbackByLeadId = {},
  auftragIdByLeadId: auftragIdByLeadIdProp = {},
  hvAbnahmeByLeadId = {},
}: {
  kunde: PortalKunde;
  leads: PortalLead[];
  angebote: PortalAngebot[];
  auftraege: PortalAuftrag[];
  mieterFeedbackByLeadId?: Record<
    string,
    { sterne: number; freitext?: string | null }
  >;
  hwErledigtByLeadId?: Record<string, boolean>;
  hvFeedbackByLeadId?: Record<
    string,
    {
      bewertung?: { sterne: number; freitext?: string | null } | null;
      maengel?: Array<{ freitext?: string | null; created_at?: string }>;
    }
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
  layout?: "default" | "embedded";
  activeSection?: "uebersicht" | "vorgaenge" | "auftraege";
  showProductPicker?: boolean;
  showAnlassBadge?: boolean;
  hideFilterBar?: boolean;
  controlledVorgangFilter?: KundeVorgangFilter;
  onVorgangFilterChange?: (filter: KundeVorgangFilter) => void;
  /** Hausverwaltungs-Portal: CRM-Resolver mit role „hv“ (kein Mieter-Status). */
  hvPortalMode?: boolean;
  /** D7 / ENTSCHEIDUNG 2 — Kennung aus Stamm; Default aus portal_modus/typ. */
  kundeTyp?: PortalKundeTyp;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const embedded = layout === "embedded";

  const kundeTyp =
    kundeTypProp ??
    resolvePortalKundeTyp({
      portal_modus: kunde.portal_modus ?? (hvPortalMode ? "organisation" : "privat"),
      typ: kunde.typ,
    });
  const isPrivatLike = kundeTyp === "privat" || kundeTyp === "gewerbe";
  const useKundeDetail = hvPortalMode || isPrivatLike;

  const initialSection = normalizeSectionFromUrl(
    activeSection === "auftraege" ? "vorgaenge" : activeSection ?? searchParams.get("section") ?? undefined
  );

  const [section, setSection] = useState<SectionId>(
    embedded ? "vorgaenge" : initialSection ?? "uebersicht"
  );
  const [internalVorgangFilter, setInternalVorgangFilter] =
    useState<KundeVorgangFilter>("aktiv");
  const vorgangFilter = controlledVorgangFilter ?? internalVorgangFilter;
  const setVorgangFilter = onVorgangFilterChange ?? setInternalVorgangFilter;
  const [privatChip, setPrivatChip] = useState<PrivatListeChip>("alle");
  const [selectedId, setSelectedId] = useState<string | null>(
    searchParams.get("id")?.trim() || null
  );
  const [_mobileDetailOpen, setMobileDetailOpen] = useState(Boolean(selectedId));
  const [listPage, setListPage] = useState(1);
  const [gptOpen, setGptOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const ignoreUrlDetailRef = useRef(false);

  const auftragIdByLeadId = useMemo(() => {
    if (Object.keys(auftragIdByLeadIdProp).length) return auftragIdByLeadIdProp;
    const map: Record<string, string> = {};
    for (const a of auftraege as Array<{ id?: string; lead_id?: string | null }>) {
      const lid = a.lead_id?.trim();
      const id = a.id?.trim();
      if (lid && id && !map[lid]) map[lid] = id;
    }
    return map;
  }, [auftragIdByLeadIdProp, auftraege]);

  const vorgaengeItems = useMemo(
    () =>
      buildKundeVorgaenge({
        leads,
        angebote,
        auftraege,
        hvPortalMode: hvPortalMode || isPrivatLike,
        mieterStatusMode: hvPortalMode || isPrivatLike ? false : true,
        mieterFeedbackByLeadId,
      }),
    [leads, angebote, auftraege, hvPortalMode, isPrivatLike, mieterFeedbackByLeadId]
  );

  const filterCounts = useMemo(
    () => countKundeVorgaengeFilter(vorgaengeItems),
    [vorgaengeItems]
  );

  const needsActionCount = useMemo(
    () => countKundeVorgaengeNeedsAction(vorgaengeItems),
    [vorgaengeItems]
  );

  const flowByItemId = useMemo(() => {
    const map = new Map<string, ReturnType<typeof inferFlowFromKundeItem>>();
    for (const item of vorgaengeItems) {
      const leadId = item.leadId ?? item.id;
      const lead = (leads as Array<{
        id: string;
        org_freigabe_status?: string | null;
        hv_meldung_status?: string | null;
      }>).find((l) => l.id === leadId);
      map.set(
        item.id,
        inferFlowFromKundeItem(item, {
          orgFreigabeStatus: lead?.org_freigabe_status,
          hvMeldungStatus: lead?.hv_meldung_status,
          hasRechnung: Boolean(
            item.dokumente?.some((d) => /rechnung/i.test(d.name ?? ""))
          ),
        })
      );
    }
    return map;
  }, [vorgaengeItems, leads]);

  const filteredVorgaenge = useMemo(() => {
    if (isPrivatLike && !hvPortalMode) {
      return vorgaengeItems.filter((item) => {
        const flow = flowByItemId.get(item.id) ?? "gemeldet";
        return privatListeChipMatches(privatChip, flow);
      });
    }
    return filterKundeVorgaenge(vorgaengeItems, vorgangFilter);
  }, [
    isPrivatLike,
    hvPortalMode,
    vorgaengeItems,
    privatChip,
    flowByItemId,
    vorgangFilter,
  ]);

  const privatKpis = useMemo(() => {
    const flowCounts = countLeadsByPortalFlow({
      leads: leads as Parameters<typeof countLeadsByPortalFlow>[0]["leads"],
      angebote: angebote as Parameters<typeof countLeadsByPortalFlow>[0]["angebote"],
      auftraege: auftraege as Parameters<typeof countLeadsByPortalFlow>[0]["auftraege"],
    });
    return buildPrivatDashboardKpis(flowCounts);
  }, [leads, angebote, auftraege]);

  const recentItems = useMemo(() => {
    return vorgaengeItems.slice(0, 4).map((item) => {
      const flow = flowByItemId.get(item.id) ?? "gemeldet";
      return {
        id: item.id,
        titel: item.title,
        objekt: item.cardSubtitle ?? item.plz ?? "—",
        flowStatus: flow,
        notfall: false,
      };
    });
  }, [vorgaengeItems, flowByItemId]);

  const cardRows = useMemo(
    () => buildKundeVorgangCardRows(filteredVorgaenge),
    [filteredVorgaenge]
  );

  const listTotalPages = Math.max(1, Math.ceil(cardRows.length / PORTAL_LIST_PAGE_SIZE));
  const safeListPage = Math.min(listPage, listTotalPages);
  const paginatedRows = cardRows.slice(
    (safeListPage - 1) * PORTAL_LIST_PAGE_SIZE,
    safeListPage * PORTAL_LIST_PAGE_SIZE
  );

  const selectedItem =
    vorgaengeItems.find((i) => i.id === selectedId) ??
    filteredVorgaenge.find((i) => i.id === selectedId) ??
    filteredVorgaenge[0] ??
    null;

  useEffect(() => {
    if (embedded || isOnboardingCompleted("portal")) return;
    setOnboardingOpen(true);
  }, [embedded]);

  useEffect(() => {
    setListPage(1);
  }, [section, vorgangFilter, privatChip]);

  useEffect(() => {
    if (embedded) return;
    if (ignoreUrlDetailRef.current) {
      const rawSection = searchParams.get("section")?.trim();
      const normalized = normalizeSectionFromUrl(rawSection);
      const rawId = searchParams.get("id")?.trim();
      if (normalized === "vorgaenge" && !rawId) {
        ignoreUrlDetailRef.current = false;
        setSection("vorgaenge");
        setSelectedId(null);
        setMobileDetailOpen(false);
      }
      return;
    }

    const rawSection = searchParams.get("section")?.trim();
    if (!rawSection) return;
    const normalized = normalizeSectionFromUrl(rawSection);
    if (!normalized) return;

    setSection(normalized);
    const itemId = searchParams.get("id")?.trim();
    if (normalized === "vorgaenge" && itemId) {
      if (vorgaengeItems.some((v) => v.id === itemId)) {
        setSelectedId(itemId);
        setMobileDetailOpen(true);
      }
    }
  }, [searchParams, vorgaengeItems, embedded]);

  function switchSection(next: SectionId) {
    ignoreUrlDetailRef.current = true;
    setSection(next);
    setSelectedId(null);
    setMobileDetailOpen(false);
    if (!embedded) {
      router.replace(`/portal?section=${next}`, { scroll: false });
    }
  }

  function openVorgang(row: PortalCardRow) {
    setSelectedId(row.id);
    setMobileDetailOpen(true);
    if (embedded && hvPortalMode) {
      const f = controlledVorgangFilter === "erledigt" ? "erledigt" : "aktiv";
      router.replace(
        `/portal?section=vorgaenge&filter=${f}&id=${encodeURIComponent(row.id)}`,
        { scroll: false }
      );
    } else if (!embedded) {
      router.replace(
        `/portal?section=vorgaenge&id=${encodeURIComponent(row.id)}`,
        { scroll: false }
      );
    }
  }

  function closeDetail() {
    setSelectedId(null);
    setMobileDetailOpen(false);
    if (embedded && hvPortalMode) {
      const f = controlledVorgangFilter === "erledigt" ? "erledigt" : "aktiv";
      router.replace(`/portal?section=vorgaenge&filter=${f}`, { scroll: false });
    } else if (!embedded) {
      router.replace(`/portal?section=vorgaenge`, { scroll: false });
    }
  }

  function renderListCard(row: PortalCardRow) {
    return (
      <PortalListCard
        key={row.id}
        selected={false}
        onClick={() => openVorgang(row)}
        title={row.title}
        subtitle={row.subtitle}
        statusLabel={row.statusLabel}
        statusPillClass={portalDetailStatusPillClass(row.statusPillKey)}
        accent={row.accent}
        meta={row.meta}
        hint={row.hint}
        footer={row.footer}
        showLeftAccent={!hvPortalMode}
      />
    );
  }

  const listPanel = (
    <div className="flex min-w-0 flex-col">
      {isPrivatLike && !hvPortalMode ? (
        <>
          <div className="px-0.5 pb-1">
            <p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">
              {portalKundeTypRoleLabel(kundeTyp)}
            </p>
            <h1 className="text-[25px] font-bold text-text-primary">
              {portalKundeListeTitle(kundeTyp)}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2 py-3.5">
            {PRIVAT_LISTE_CHIPS.map((chip) => {
              const on = privatChip === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setPrivatChip(chip.id)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[12.5px] font-semibold",
                    on
                      ? "border border-transparent bg-[#1A3D2B] text-white"
                      : "border border-border-default bg-white text-text-secondary"
                  )}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </>
      ) : !hideFilterBar ? (
        <VorgangListFilterBar
          filter={vorgangFilter}
          onFilterChange={setVorgangFilter}
          counts={filterCounts}
        />
      ) : null}
      <div className="portal-list-panel portal-list-rows">
        {paginatedRows.length === 0 ? (
          vorgaengeItems.length === 0 ? (
            <div className="p-4">
              <PortalEmptyState
                role={hvPortalMode ? "hv" : "kunde"}
                compact
              />
            </div>
          ) : (
            <p className="portal-text-body px-4 py-8 text-center text-text-secondary">
              {isPrivatLike
                ? "Keine Vorgänge in diesem Filter."
                : vorgangFilter === "aktiv"
                  ? "Keine aktiven Vorgänge."
                  : "Keine erledigten Vorgänge."}
            </p>
          )
        ) : (
          paginatedRows.map(renderListCard)
        )}
        {cardRows.length > PORTAL_LIST_PAGE_SIZE ? (
          <PortalListPagination
            totalItems={cardRows.length}
            itemLabel={isPrivatLike ? "Aufträge" : "Vorgänge"}
            currentPage={safeListPage}
            totalPages={listTotalPages}
            onPageChange={setListPage}
          />
        ) : null}
      </div>
    </div>
  );

  const selectedLeadId = selectedItem?.leadId ?? selectedItem?.id ?? "";

  const detailScreen = selectedItem ? (
    <div className="-mx-4 -mt-4 min-w-0 lg:-mx-6 lg:-mt-5">
      <PortalVorgangDetail
        item={selectedItem}
        showAnlassBadge={showAnlassBadge}
        onAccepted={() => router.refresh()}
        hwErledigt={hwErledigtByLeadId[selectedLeadId]}
        hvFeedback={hvFeedbackByLeadId[selectedLeadId]}
        auftragId={auftragIdByLeadId[selectedLeadId]}
        hvAbnahme={hvAbnahmeByLeadId[selectedLeadId] ?? null}
        showHvAbnahme={useKundeDetail}
        privatkunde={isPrivatLike}
        orgFreigabeStatus={
          (leads as Array<{ id: string; org_freigabe_status?: string | null }>).find(
            (l) => l.id === selectedLeadId
          )?.org_freigabe_status ?? null
        }
        hvMeldungStatus={
          (leads as Array<{ id: string; hv_meldung_status?: string | null }>).find(
            (l) => l.id === selectedLeadId
          )?.hv_meldung_status ?? null
        }
        schwelleEur={kunde.freigabe_schwelle_eur ?? undefined}
        onHvFeedbackSubmitted={() => router.refresh()}
        onBack={closeDetail}
      />
    </div>
  ) : null;

  /** Mock: Liste und Detail sind getrennte Screens — kein Split-Pane. */
  const vorgaengeScreen = selectedItem ? detailScreen : listPanel;

  if (embedded) {
    return <div className="min-w-0">{vorgaengeScreen}</div>;
  }

  const navRole = portalNavRoleForKundeTyp(kundeTyp);

  return (
    <>
      <PortalShell
        variant="kunde"
        brandTitle="MeinBärenwald"
        brandSubtitle={kunde.name?.trim() || "Kundenportal"}
        brandKuerzel="B"
        sidebarOwner={kunde.name?.trim() || "MeinBärenwald"}
        activeNavId={section === "gpt" ? "uebersicht" : section}
        onNavChange={(id) => {
          switchSection(id as SectionId);
        }}
        nav={buildPortalShellNav(navRole, "kunde", {
          liste: needsActionCount,
        })}
        createAction={{
          label: portalCreateLabel(navRole),
          onClick: () => setCreateOpen(true),
        }}
        headerUser={{
          name: kunde.name?.trim() || "MeinBärenwald",
        }}
        notifications={
          <>
            <PortalUserNotificationBell role="kunde" />
            <form action="/portal/auth/signout" method="post">
              <button type="submit" className="btn-pill-outline portal-btn-compact">
                Abmelden
              </button>
            </form>
          </>
        }
      >
          {section === "gpt" ? (
            <article className="portal-surface hidden overflow-hidden p-0 lg:block">
              <PortalBaerenwaldGpt variant="embedded" open onClose={() => switchSection("uebersicht")} />
            </article>
          ) : null}

          {section === "profil" && isPrivatLike ? (
            <PortalEinstellungenPrivat
              name={kunde.name}
              email={kunde.email}
              kundeTyp={kundeTyp === "gewerbe" ? "gewerbe" : "privat"}
            />
          ) : null}

          {section === "profil" && !isPrivatLike ? (
            <article className="portal-surface space-y-4 p-4 sm:p-5">
              <div>
                <p className="portal-text-section text-text-primary">Einstellungen</p>
                <p className="portal-text-body mt-1 text-text-secondary">
                  Konto und Kontaktdaten für MeinBärenwald.
                </p>
              </div>
              <dl className="space-y-3">
                <div>
                  <dt className="portal-text-meta text-text-tertiary">Name</dt>
                  <dd className="portal-text-body font-medium text-text-primary">
                    {kunde.name?.trim() || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="portal-text-meta text-text-tertiary">E-Mail</dt>
                  <dd className="portal-text-body font-medium text-text-primary">
                    {kunde.email?.trim() || "—"}
                  </dd>
                </div>
              </dl>
              <form action="/portal/auth/signout" method="post">
                <button type="submit" className="btn-pill-outline portal-btn">
                  Abmelden
                </button>
              </form>
            </article>
          ) : null}

          {section === "uebersicht" && isPrivatLike ? (
            <PortalKundePrivatDashboard
              hello={portalKundeDashboardHello(kundeTyp, kunde.name)}
              kundeTyp={kundeTyp === "gewerbe" ? "gewerbe" : "privat"}
              kpis={privatKpis}
              recent={recentItems}
              heroImageUrl={PORTAL_HEADER_HERO_SRC}
              onOpenAll={() => switchSection("vorgaenge")}
              onOpenItem={(id) => {
                setSelectedId(id);
                setMobileDetailOpen(true);
                switchSection("vorgaenge");
                router.replace(
                  `/portal?section=vorgaenge&id=${encodeURIComponent(id)}`,
                  { scroll: false }
                );
              }}
            />
          ) : null}

          {section === "uebersicht" && !isPrivatLike ? (
            <PortalKundePrivatDashboard
              hello={portalKundeDashboardHello(kundeTyp, kunde.name)}
              kundeTyp="privat"
              kpis={privatKpis}
              recent={recentItems}
              heroImageUrl={PORTAL_HEADER_HERO_SRC}
              onOpenAll={() => switchSection("vorgaenge")}
              onOpenItem={(id) => {
                setSelectedId(id);
                setMobileDetailOpen(true);
                switchSection("vorgaenge");
                router.replace(
                  `/portal?section=vorgaenge&id=${encodeURIComponent(id)}`,
                  { scroll: false }
                );
              }}
            />
          ) : null}

          {section === "vorgaenge" ? vorgaengeScreen : null}
      </PortalShell>

      {gptOpen ? (
        <PortalBaerenwaldGpt open onClose={() => setGptOpen(false)} />
      ) : null}

      <PortalCreateFunnelModal
        open={createOpen}
        channel="portal_privat"
        title={portalCreateLabel(navRole)}
        prefill={{
          name: kunde.name?.trim() || undefined,
          email: kunde.email?.trim() || undefined,
        }}
        onClose={() => setCreateOpen(false)}
        onDone={() => {
          setCreateOpen(false);
          router.refresh();
        }}
      />

      {onboardingOpen ? (
        <OnboardingTour
          open={onboardingOpen}
          audience="portal"
          slides={PORTAL_ONBOARDING_SLIDES}
          onClose={() => setOnboardingOpen(false)}
        />
      ) : null}

      <div className="mx-auto hidden max-w-[1200px] px-6 lg:block">
        <PortalLegalFooter variant="kunde" className="mt-8" />
      </div>
    </>
  );
}
