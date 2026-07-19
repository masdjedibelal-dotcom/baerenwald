"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MessagesSquare,
  Phone,
  X,
} from "lucide-react";

import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import "@/components/onboarding/onboarding.css";
import { PortalBaerenwaldGpt } from "@/components/portal/PortalBaerenwaldGpt";
import { PortalEinstellungenPrivat } from "@/components/portal/PortalEinstellungenPrivat";
import { PortalKundePrivatDashboard } from "@/components/portal/PortalKundePrivatDashboard";
import { PortalUserNotificationBell } from "@/components/portal/PortalUserNotificationBell";
import { PortalVorgangDetail } from "@/components/portal/PortalVorgangDetail";
import { PortalLegalFooter } from "@/components/shared/PortalLegalFooter";
import { PortalShell } from "@/components/shared/PortalShell";
import { PortalEmptyState } from "@/components/shared/PortalStateView";
import { PortalListCard } from "@/components/shared/PortalListCard";
import { PortalMobileBottomSheet } from "@/components/shared/PortalMobileBottomSheet";
import {
  PORTAL_LIST_PAGE_SIZE,
  PortalListPagination,
} from "@/components/shared/PortalListPagination";
import { SITE_CONFIG } from "@/lib/config";
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
  const [mobileDetailOpen, setMobileDetailOpen] = useState(Boolean(selectedId));
  const [listPage, setListPage] = useState(1);
  const [gptOpen, setGptOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const ignoreUrlDetailRef = useRef(false);

  const vorname =
    kunde.name?.trim().split(/\s+/)[0] ||
    kunde.email?.split("@")[0]?.replace(/[._]/g, " ") ||
    "du";

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
    if (!embedded) {
      router.replace(`/portal?section=vorgaenge&id=${encodeURIComponent(row.id)}`, {
        scroll: false,
      });
    }
  }

  function renderListCard(row: PortalCardRow) {
    return (
      <PortalListCard
        key={row.id}
        selected={selectedId === row.id}
        onClick={() => openVorgang(row)}
        title={row.title}
        subtitle={row.subtitle}
        statusLabel={row.statusLabel}
        statusPillClass={portalDetailStatusPillClass(row.statusPillKey)}
        accent={row.accent}
        meta={row.meta}
        hint={row.hint}
        footer={row.footer}
      />
    );
  }

  const listPanel = (
    <article className="card-bordered flex min-h-0 flex-col overflow-hidden lg:min-h-[520px]">
      {isPrivatLike && !hvPortalMode ? (
        <>
          <div className="border-b border-border-default px-3 pt-4 sm:px-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
              {portalKundeTypRoleLabel(kundeTyp)}
            </p>
            <h2 className="portal-text-section text-text-primary">
              {portalKundeListeTitle(kundeTyp)}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2 border-b border-border-default px-3 py-3 sm:px-4">
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
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 sm:p-4">
        {paginatedRows.length === 0 ? (
          vorgaengeItems.length === 0 ? (
            <PortalEmptyState
              role={hvPortalMode ? "hv" : "kunde"}
              compact
            />
          ) : (
            <p className="portal-text-body py-8 text-center text-text-secondary">
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
      </div>
      {cardRows.length > PORTAL_LIST_PAGE_SIZE ? (
        <PortalListPagination
          totalItems={cardRows.length}
          itemLabel={isPrivatLike ? "Aufträge" : "Vorgänge"}
          currentPage={safeListPage}
          totalPages={listTotalPages}
          onPageChange={setListPage}
        />
      ) : null}
    </article>
  );

  const selectedLeadId = selectedItem?.leadId ?? selectedItem?.id ?? "";

  const detailPanel = selectedItem ? (
    <article className="card-bordered min-h-0 overflow-y-auto p-4 sm:p-5 lg:max-h-[calc(100vh-180px)]">
      <div className="mb-3 flex justify-end lg:hidden">
        <button
          type="button"
          onClick={() => {
            setMobileDetailOpen(false);
            setSelectedId(null);
          }}
          className="rounded-full p-2 hover:bg-muted"
          aria-label="Schließen"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
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
      />
    </article>
  ) : (
    <article className="card-bordered hidden min-h-[320px] items-center justify-center p-8 text-center lg:flex">
      <p className="portal-text-body text-text-secondary">
        Wähle links einen Vorgang für Details.
      </p>
    </article>
  );

  if (embedded) {
    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_1fr]">
        {listPanel}
        {detailPanel}
        <PortalMobileBottomSheet
          open={mobileDetailOpen && Boolean(selectedItem)}
          onClose={() => setMobileDetailOpen(false)}
          ariaLabel="Vorgangsdetails"
        >
          {selectedItem ? (
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
            />
          ) : null}
        </PortalMobileBottomSheet>
      </div>
    );
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
          onClick: () => router.push("/rechner"),
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
            <article className="card-bordered hidden overflow-hidden p-0 lg:block">
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
            <article className="card-bordered space-y-4 p-4 sm:p-5">
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
            <div className="space-y-4">
              <PortalKundePrivatDashboard
                hello={portalKundeDashboardHello(kundeTyp, kunde.name)}
                kundeTyp={kundeTyp === "gewerbe" ? "gewerbe" : "privat"}
                kpis={privatKpis}
                recent={recentItems}
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
              <button
                type="button"
                onClick={() => setGptOpen(true)}
                className="card-bordered flex w-full items-center justify-between gap-3 p-4 text-left lg:hidden"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF3DE] text-[#2E7D52]">
                    <MessagesSquare className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="portal-text-body font-semibold">Bärenwald GPT</p>
                    <p className="portal-text-meta text-text-secondary">
                      Beratung & Visualisierung
                    </p>
                  </div>
                </div>
                <span className="font-semibold text-accent">Öffnen →</span>
              </button>
            </div>
          ) : null}

          {section === "uebersicht" && !isPrivatLike ? (
            <>
              <div className="space-y-0.5">
                <p className="portal-text-section text-text-primary">Hallo {vorname}</p>
                <p className="portal-text-body text-text-secondary">
                  Deine Projekte an einem Ort
                </p>
              </div>

              <div className="grid min-w-0 grid-cols-3 gap-2">
                <article className="portal-kpi-card">
                  <p className="portal-kpi-label">Aktiv</p>
                  <p className="portal-kpi-value">{filterCounts.aktiv}</p>
                </article>
                <article className="portal-kpi-card">
                  <p className="portal-kpi-label">Zur Prüfung</p>
                  <p className="portal-kpi-value">{needsActionCount}</p>
                </article>
                <article className="portal-kpi-card">
                  <p className="portal-kpi-label">Erledigt</p>
                  <p className="portal-kpi-value">{filterCounts.erledigt}</p>
                </article>
              </div>

              <button
                type="button"
                onClick={() => setGptOpen(true)}
                className="card-bordered flex w-full items-center justify-between gap-3 p-4 text-left lg:hidden"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF3DE] text-[#2E7D52]">
                    <MessagesSquare className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="portal-text-body font-semibold">Bärenwald GPT</p>
                    <p className="portal-text-meta text-text-secondary">Beratung & Visualisierung</p>
                  </div>
                </div>
                <span className="font-semibold text-accent">Öffnen →</span>
              </button>

              <article className="card-bordered p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="font-semibold text-text-primary">Deine Vorgänge</h2>
                  <button
                    type="button"
                    onClick={() => switchSection("vorgaenge")}
                    className="portal-text-meta font-semibold text-accent"
                  >
                    Alle anzeigen
                  </button>
                </div>
                <div className="space-y-2">
                  {buildKundeVorgangCardRows(filterKundeVorgaenge(vorgaengeItems, "aktiv"))
                    .slice(0, 5)
                    .map(renderListCard)}
                  {filterCounts.aktiv === 0 ? (
                    <PortalEmptyState role="kunde" compact />
                  ) : null}
                </div>
              </article>

              <article className="card-bordered p-4 sm:p-5">
                <h2 className="font-semibold text-text-primary">Kontakt</h2>
                <p className="portal-text-body mt-2 text-text-secondary">
                  Fragen zu deinem Projekt? Wir sind für dich da.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a href={SITE_CONFIG.phoneHref} className="btn-pill-primary inline-flex items-center gap-2 !py-2.5">
                    <Phone className="h-4 w-4" />
                    Anrufen
                  </a>
                  <a
                    href={`mailto:${SITE_CONFIG.email}`}
                    className="btn-pill-outline !py-2.5"
                  >
                    E-Mail schreiben
                  </a>
                </div>
              </article>
            </>
          ) : null}

          {section === "vorgaenge" ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_1fr]">
              {listPanel}
              {detailPanel}
            </div>
          ) : null}
      </PortalShell>

      <PortalMobileBottomSheet
        open={section === "vorgaenge" && mobileDetailOpen && Boolean(selectedItem)}
        onClose={() => setMobileDetailOpen(false)}
        ariaLabel="Vorgangsdetails"
      >
        {selectedItem ? (
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
          />
        ) : null}
      </PortalMobileBottomSheet>

      {gptOpen ? (
        <PortalBaerenwaldGpt open onClose={() => setGptOpen(false)} />
      ) : null}

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
