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
import { PortalHeaderSearch } from "@/components/shared/PortalHeaderSearch";
import { PortalEmptyState } from "@/components/shared/PortalStateView";
import { PortalListCard } from "@/components/shared/PortalListCard";
import {
  PORTAL_LIST_PAGE_SIZE,
  PortalListPagination,
} from "@/components/shared/PortalListPagination";
import {
  PortalListeFilterChip,
  PortalListeTitle,
} from "@/components/shared/PortalListeChrome";
import {
  countUnreadBautagebuch,
  getBautagebuchLastSeenAt,
} from "@/lib/portal2/bautagebuch-attention";
import { portalListStackClass } from "@/lib/portal2/layout-chrome";
import { isOnboardingCompleted } from "@/lib/onboarding/storage";
import { PORTAL_ONBOARDING_SLIDES } from "@/lib/onboarding/portal-slides";
import { buildKundeVorgaenge } from "@/lib/portal/build-kunde-vorgaenge";
import {
  countKundeVorgaengeFilter,
  countKundeVorgaengeNeedsAction,
  filterKundeVorgaenge,
  type KundeVorgangFilter,
} from "@/lib/portal/kunde-vorgang-filter";
import type { OrgVorgangFilter } from "@/lib/org/org-vorgang-filter";
import {
  buildKundeVorgangCardRows,
  type PortalCardRow,
} from "@/lib/portal/portal-list-mappers";
import { portalCreateChannel, portalCreateLabel } from "@/lib/portal2/create";
import { buildPortalContactPrefill } from "@/lib/portal/portal-contact-prefill";
import {
  countLeadsByPortalFlow,
  pickPreferredAngebotForPortalFlow,
  resolveLeadPortalFlowStatus,
} from "@/lib/portal2/hv-dashboard";
import { hvListeChipMatches } from "@/lib/portal2/hv-liste";
import {
  buildPrivatDashboardKpis,
  PRIVAT_LISTE_CHIPS,
  privatKpiToListeChip,
  privatListeChipMatches,
  type PrivatListeChip,
} from "@/lib/portal2/kunde-dashboard";
import {
  portalKundeDashboardHello,
  portalKundeListeTitle,
  portalNavRoleForKundeTyp,
  resolvePortalKundeTyp,
  type PortalKundeTyp,
} from "@/lib/portal2/kunde-typ";
import { buildPortalShellNav } from "@/lib/portal2/nav-items";
import { portalDetailStatusPillClass } from "@/lib/shared/portal-detail-format";
import {
  PORTAL_STATUS,
  portalMieterStatusLabel,
  portalStatusChipStyle,
  type PortalMockStatusId,
} from "@/lib/portal2/status";
import { cn } from "@/lib/utils";

type PortalKunde = {
  name?: string | null;
  email?: string | null;
  telefon?: string | null;
  plz?: string | null;
  ort?: string | null;
  adresse?: string | null;
  freigabe_schwelle_eur?: number | null;
  portal_modus?: string | null;
  typ?: string | null;
};

type PortalLead = Parameters<typeof buildKundeVorgaenge>[0]["leads"][number];
type PortalAngebot = Parameters<typeof buildKundeVorgaenge>[0]["angebote"][number];
type PortalAuftrag = Parameters<typeof buildKundeVorgaenge>[0]["auftraege"][number];

type SectionId = "uebersicht" | "vorgaenge" | "gpt" | "profil";

const VORGANG_FILTER_LABELS: Record<KundeVorgangFilter, string> = {
  alle: "Alle",
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
  controlledHvListeFilter,
  onVorgangFilterChange,
  onHvDetailOpenChange,
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
  /** HV-Liste: Flow-Chips (Offen · In Arbeit · Erledigt). */
  controlledHvListeFilter?: OrgVorgangFilter;
  /** Embedded HV: Parent blendet Listen-Chrome aus, sobald Detail offen ist. */
  onHvDetailOpenChange?: (open: boolean) => void;
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
  /** Mock-Detail (Timeline/Meta): HV und Privat/Gewerbe. */
  const useHvMockDetail = hvPortalMode || isPrivatLike;
  const [clientReady, setClientReady] = useState(false);
  useEffect(() => {
    setClientReady(true);
  }, []);

  const fabContactPrefill = useMemo(() => {
    const built = buildPortalContactPrefill({
      kunde: {
        name: kunde.name,
        email: kunde.email,
        telefon: kunde.telefon,
        plz: kunde.plz,
        ort: kunde.ort,
        adresse: kunde.adresse,
      },
      leads: leads as Parameters<typeof buildPortalContactPrefill>[0]["leads"],
    });
    const name =
      [built.vorname, built.nachname].filter(Boolean).join(" ").trim() ||
      kunde.name?.trim() ||
      undefined;
    return {
      name,
      email: built.email || kunde.email?.trim() || undefined,
      telefon: built.telefon,
      plz: built.plz,
      ort: built.ort,
      strasse: built.strasse,
      hausnummer: built.hausnummer,
    };
  }, [kunde, leads]);

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
        mieterStatusMode: !hvPortalMode,
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
    const angeboteByLead = new Map<string, PortalAngebot[]>();
    for (const a of angebote as PortalAngebot[]) {
      const lid = (a as { lead_id?: string | null }).lead_id?.trim();
      if (!lid) continue;
      const list = angeboteByLead.get(lid) ?? [];
      list.push(a);
      angeboteByLead.set(lid, list);
    }
    const angebotByLead = new Map<string, PortalAngebot>();
    for (const [lid, list] of Array.from(angeboteByLead.entries())) {
      const preferred = pickPreferredAngebotForPortalFlow(list);
      if (preferred) angebotByLead.set(lid, preferred);
    }
    const auftragByLead = new Map<string, PortalAuftrag>();
    for (const a of auftraege as PortalAuftrag[]) {
      const lid = (a as { lead_id?: string | null }).lead_id?.trim();
      if (lid && !auftragByLead.has(lid)) auftragByLead.set(lid, a);
    }

    const map = new Map<string, PortalMockStatusId>();
    for (const item of vorgaengeItems) {
      const leadId = item.leadId ?? item.id;
      const lead = (leads as PortalLead[]).find((l) => l.id === leadId);
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

  const filteredVorgaenge = useMemo(() => {
    if (isPrivatLike && !hvPortalMode) {
      return vorgaengeItems.filter((item) => {
        const flow = flowByItemId.get(item.id) ?? "gemeldet";
        return privatListeChipMatches(privatChip, flow);
      });
    }
    if (hvPortalMode && controlledHvListeFilter) {
      return vorgaengeItems.filter((item) => {
        const flow = flowByItemId.get(item.id) ?? "gemeldet";
        return hvListeChipMatches(controlledHvListeFilter, flow);
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
    controlledHvListeFilter,
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
        hvMieterView: Boolean(item.hvMieterView),
        statusLabel: item.hvMieterView
          ? item.status || portalMieterStatusLabel(flow)
          : undefined,
      };
    });
  }, [vorgaengeItems, flowByItemId]);

  const cardRows = useMemo(
    () =>
      buildKundeVorgangCardRows(filteredVorgaenge, {
        mockListe: hvPortalMode || (isPrivatLike && !hvPortalMode),
      }),
    [filteredVorgaenge, isPrivatLike, hvPortalMode]
  );

  const listTotalPages = Math.max(1, Math.ceil(cardRows.length / PORTAL_LIST_PAGE_SIZE));
  const safeListPage = Math.min(listPage, listTotalPages);
  const paginatedRows = cardRows.slice(
    (safeListPage - 1) * PORTAL_LIST_PAGE_SIZE,
    safeListPage * PORTAL_LIST_PAGE_SIZE
  );

  const selectedItem = selectedId
    ? vorgaengeItems.find((i) => i.id === selectedId) ??
      filteredVorgaenge.find((i) => i.id === selectedId) ??
      null
    : null;

  useEffect(() => {
    if (embedded || isOnboardingCompleted("portal")) return;
    setOnboardingOpen(true);
  }, [embedded]);

  useEffect(() => {
    setListPage(1);
  }, [section, vorgangFilter, privatChip, controlledHvListeFilter]);

  useEffect(() => {
    if (!hvPortalMode || !onHvDetailOpenChange) return;
    onHvDetailOpenChange(Boolean(selectedId));
  }, [hvPortalMode, onHvDetailOpenChange, selectedId]);

  useEffect(() => {
    if (embedded) {
      if (!hvPortalMode) return;
      if (ignoreUrlDetailRef.current) {
        const rawId = searchParams.get("id")?.trim();
        if (!rawId) ignoreUrlDetailRef.current = false;
        return;
      }
      const itemId = searchParams.get("id")?.trim();
      if (itemId && vorgaengeItems.some((v) => v.id === itemId)) {
        setSelectedId(itemId);
        setMobileDetailOpen(true);
      } else if (!itemId) {
        setSelectedId(null);
        setMobileDetailOpen(false);
      }
      return;
    }
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
    } else if (normalized === "vorgaenge") {
      setSelectedId(null);
      setMobileDetailOpen(false);
    }
  }, [searchParams, vorgaengeItems, embedded, hvPortalMode]);

  function switchSection(next: SectionId) {
    ignoreUrlDetailRef.current = true;
    setSection(next);
    setSelectedId(null);
    setMobileDetailOpen(false);
    if (!embedded) {
      router.replace(`/portal?section=${next}`, { scroll: false });
    }
  }

  function hvListeFilterForUrl(): OrgVorgangFilter {
    if (controlledHvListeFilter) return controlledHvListeFilter;
    if (controlledVorgangFilter === "erledigt") return "erledigt";
    if (controlledVorgangFilter === "alle") return "alle";
    return "offen";
  }

  function openVorgang(row: PortalCardRow) {
    setSelectedId(row.id);
    setMobileDetailOpen(true);
    if (embedded && hvPortalMode) {
      const f = hvListeFilterForUrl();
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
    ignoreUrlDetailRef.current = true;
    setSelectedId(null);
    setMobileDetailOpen(false);
    onHvDetailOpenChange?.(false);
    if (embedded && hvPortalMode) {
      const f = hvListeFilterForUrl();
      router.replace(`/portal?section=vorgaenge&filter=${f}`, { scroll: false });
    } else if (!embedded) {
      router.replace(`/portal?section=vorgaenge`, { scroll: false });
    }
  }

  function renderListCard(row: PortalCardRow) {
    const flow = flowByItemId.get(row.id);
    const mockListe = hvPortalMode || (isPrivatLike && !hvPortalMode);
    const mieterStatus = Boolean(row.hvMieterView);
    const statusLabel =
      mieterStatus
        ? row.statusLabel
        : mockListe && flow
          ? PORTAL_STATUS[flow].label
          : row.statusLabel;
    const statusPillStyle =
      mockListe && flow ? portalStatusChipStyle(flow) : undefined;

    const leadKey = row.leadId ?? row.id;
    const btUnread =
      clientReady && hvPortalMode && !mieterStatus && row.bautagebuch?.length
        ? countUnreadBautagebuch(
            row.bautagebuch,
            getBautagebuchLastSeenAt(leadKey)
          )
        : 0;

    return (
      <PortalListCard
        key={row.id}
        variant={mockListe ? "responsive" : "row"}
        selected={false}
        onClick={() => openVorgang(row)}
        title={row.title}
        subtitle={row.subtitle}
        statusLabel={statusLabel}
        statusPillClass={portalDetailStatusPillClass(row.statusPillKey)}
        statusPillStyle={statusPillStyle}
        accent={row.accent}
        meta={row.meta}
        hint={mockListe ? undefined : row.hint}
        footer={mockListe ? undefined : row.footer}
        showLeftAccent={false}
        showChevron={mockListe}
        attentionBadge={btUnread > 0 ? btUnread : null}
      />
    );
  }

  const listPanel = (
    <div className="flex min-w-0 flex-col">
      {isPrivatLike && !hvPortalMode ? (
        <>
          <div className="px-0.5 pb-1">
            <PortalListeTitle>
              {portalKundeListeTitle(kundeTyp)}
            </PortalListeTitle>
          </div>
          <div className="flex flex-wrap gap-2 py-3.5">
            {PRIVAT_LISTE_CHIPS.map((chip) => (
              <PortalListeFilterChip
                key={chip.id}
                active={privatChip === chip.id}
                onClick={() => setPrivatChip(chip.id)}
              >
                {chip.label}
              </PortalListeFilterChip>
            ))}
          </div>
        </>
      ) : !hideFilterBar ? (
        <VorgangListFilterBar
          filter={vorgangFilter}
          onFilterChange={setVorgangFilter}
          counts={filterCounts}
        />
      ) : null}
      <div
        className={cn(
          hvPortalMode || (isPrivatLike && !hvPortalMode)
            ? portalListStackClass("responsive")
            : "portal-list-panel portal-list-rows"
        )}
      >
        {paginatedRows.length === 0 ? (
          vorgaengeItems.length === 0 ? (
            <div className="rounded-[12px] border border-border-default bg-white p-4">
              <PortalEmptyState
                role={hvPortalMode ? "hv" : "kunde"}
                compact
              />
            </div>
          ) : (
            <p className="portal-text-body rounded-[12px] border border-border-default bg-white px-4 py-8 text-center text-text-secondary">
              {hvPortalMode && controlledHvListeFilter
                ? controlledHvListeFilter === "alle"
                  ? "Keine Vorgänge."
                  : controlledHvListeFilter === "offen"
                    ? "Keine offenen Vorgänge."
                    : controlledHvListeFilter === "in_arbeit"
                      ? "Keine Vorgänge in Arbeit."
                      : "Keine erledigten Vorgänge."
                : isPrivatLike
                  ? "Noch keine Vorgänge"
                  : vorgangFilter === "alle"
                    ? "Keine Vorgänge."
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
        showHvAbnahme={useHvMockDetail}
        privatkunde={isPrivatLike}
        flowStatusOverride={
          selectedItem ? flowByItemId.get(selectedItem.id) : undefined
        }
        mieterStatusMode={Boolean(selectedItem?.hvMieterView)}
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
        headerSearch={
          <PortalHeaderSearch
            onSubmit={() => {
              switchSection("vorgaenge");
            }}
          />
        }
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
              telefon={kunde.telefon}
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
              profileName={kunde.name?.trim() || "MeinBärenwald"}
              kundeTyp={kundeTyp === "gewerbe" ? "gewerbe" : "privat"}
              kpis={privatKpis}
              recent={recentItems}
              heroImageUrl={PORTAL_HEADER_HERO_SRC}
              onOpenAll={() => {
                setPrivatChip("alle");
                switchSection("vorgaenge");
              }}
              onKpiClick={(id) => {
                setPrivatChip(privatKpiToListeChip(id));
                switchSection("vorgaenge");
              }}
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
              profileName={kunde.name?.trim() || "MeinBärenwald"}
              kundeTyp="privat"
              kpis={privatKpis}
              recent={recentItems}
              heroImageUrl={PORTAL_HEADER_HERO_SRC}
              onOpenAll={() => {
                setPrivatChip("alle");
                switchSection("vorgaenge");
              }}
              onKpiClick={(id) => {
                setPrivatChip(privatKpiToListeChip(id));
                switchSection("vorgaenge");
              }}
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
        channel={portalCreateChannel(navRole)}
        title={portalCreateLabel(navRole)}
        prefill={fabContactPrefill}
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
