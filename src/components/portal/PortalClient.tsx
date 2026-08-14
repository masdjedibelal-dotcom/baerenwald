"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";

import dynamic from "next/dynamic";
import { PortalKundePrivatDashboard } from "@/components/portal/PortalKundePrivatDashboard";
import { portalHeaderHeroSrc } from "@/lib/portal2/portal-media";
import { PortalUserNotificationBell } from "@/components/portal/PortalUserNotificationBell";
import type { KundePortalDetailItem } from "@/lib/portal/portal-detail-item";
import type { PortalBautagebuchEntry } from "@/lib/portal/portal-detail-item";
import { emitPortalNotificationsChanged } from "@/lib/portal2/notif-refresh";
import { ensurePortalVorgangNotificationHref } from "@/lib/portal2/portal-detail-deep-link";
import {
  paintPortalBusyNow,
  PORTAL_BUSY_MIN_MS,
  usePortalBusy,
} from "@/components/shared/PortalBusyContext";
import { PortalContentBusy } from "@/components/shared/PortalContentBusy";
import { usePortalRefresh } from "@/components/shared/usePortalRefresh";

const PortalBaerenwaldGpt = dynamic(
  () =>
    import("@/components/portal/PortalBaerenwaldGpt").then((m) => m.PortalBaerenwaldGpt),
  { ssr: false, loading: () => null }
);
const PortalCreateFunnelModal = dynamic(
  () =>
    import("@/components/portal/PortalCreateFunnelModal").then(
      (m) => m.PortalCreateFunnelModal
    ),
  { ssr: false, loading: () => null }
);
const PortalEinstellungenPrivat = dynamic(
  () =>
    import("@/components/portal/PortalEinstellungenPrivat").then(
      (m) => m.PortalEinstellungenPrivat
    ),
  { ssr: false, loading: () => null }
);
const PortalEinstellungenMieter = dynamic(
  () =>
    import("@/components/portal/PortalEinstellungenMieter").then(
      (m) => m.PortalEinstellungenMieter
    ),
  { ssr: false, loading: () => null }
);
const PortalVorgangDetail = dynamic(
  () =>
    import("@/components/portal/PortalVorgangDetail").then((m) => m.PortalVorgangDetail),
  {
    ssr: false,
    loading: () => (
      <PortalContentBusy
        title="Vorgang wird geladen…"
        body="Einen Moment — wir öffnen die Details."
      />
    ),
  }
);
import { PortalLegalFooter } from "@/components/shared/PortalLegalFooter";
import { PortalShell } from "@/components/shared/PortalShell";
import { PortalHeaderSearch } from "@/components/shared/PortalHeaderSearch";
import { PortalInboxEmpty } from "@/components/shared/PortalEmptyState";
import { PortalEmptyState } from "@/components/shared/PortalStateView";
import { PortalListCard } from "@/components/shared/PortalListCard";
import {
  PORTAL_LIST_PAGE_SIZE,
  PortalListPagination,
} from "@/components/shared/PortalListPagination";
import {
  PortalListeTitle,
} from "@/components/shared/PortalListeChrome";
import { PortalListeFilterBar } from "@/components/shared/PortalListeFilterBar";
import {
  countUnreadBautagebuch,
  getBautagebuchLastSeenAt,
} from "@/lib/portal2/bautagebuch-attention";
import { portalListStackClass } from "@/lib/portal2/layout-chrome";
import { buildKundeVorgaenge } from "@/lib/portal/build-kunde-vorgaenge";
import { findKundeVorgangByQueryId } from "@/lib/portal/portal-detail-item";
import {
  countKundeVorgaengeNeedsAction,
  filterKundeVorgaenge,
  type KundeVorgangFilter,
} from "@/lib/portal/kunde-vorgang-filter";
import type { OrgVorgangFilter } from "@/lib/org/org-vorgang-filter";
import {
  buildKundeVorgangCardRows,
  type PortalCardRow,
} from "@/lib/portal/portal-list-mappers";
import {
  compareByNewestCreated,
  compareVorgangListOrder,
  PORTAL_DASHBOARD_RECENT_LIMIT,
  portalFlowSortRank,
} from "@/lib/portal/portal-vorgang-sort";
import { portalClientCreateChannel, portalCreateLabel } from "@/lib/portal2/create";
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
import type { MieterHvBrand } from "@/lib/portal/load-mieter-hv-brand";
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

function mergeBautagebuchOntoItem(
  item: KundePortalDetailItem,
  byLeadId: Record<string, PortalBautagebuchEntry[]>
): KundePortalDetailItem {
  if (item.hvMieterView) return item;
  const leadKey = item.leadId ?? item.id;
  const fromMap = byLeadId[leadKey] ?? [];
  if (!fromMap.length) return item;
  const byId = new Map<string, PortalBautagebuchEntry>();
  for (const e of item.bautagebuch ?? []) {
    const id = e.id?.trim();
    if (id) byId.set(id, e);
  }
  for (const e of fromMap) {
    const id = e.id?.trim();
    if (id) byId.set(id, e);
  }
  const merged = Array.from(byId.values()).sort((a, b) => {
    const da = a.created_at || a.datum || "";
    const db = b.created_at || b.datum || "";
    return db.localeCompare(da);
  });
  return { ...item, bautagebuch: merged };
}

function mergeBautagebuchForListRow(
  row: PortalCardRow,
  byLeadId: Record<string, PortalBautagebuchEntry[]>
): PortalBautagebuchEntry[] | undefined {
  const leadKey = row.leadId ?? row.id;
  const fromMap = byLeadId[leadKey] ?? [];
  if (!fromMap.length) return row.bautagebuch;
  if (!row.bautagebuch?.length) return fromMap;
  const byId = new Map<string, PortalBautagebuchEntry>();
  for (const e of row.bautagebuch) {
    const id = e.id?.trim();
    if (id) byId.set(id, e);
  }
  for (const e of fromMap) {
    const id = e.id?.trim();
    if (id) byId.set(id, e);
  }
  return Array.from(byId.values());
}

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
}: {
  filter: KundeVorgangFilter;
  onFilterChange: (filter: KundeVorgangFilter) => void;
}) {
  return (
    <PortalListeFilterBar
      value={filter}
      onChange={onFilterChange}
      sheetTitle="Vorgänge"
      className="border-b border-border-default px-3 sm:px-4"
      options={(["aktiv", "erledigt"] as const).map((id) => ({
        id,
        label: VORGANG_FILTER_LABELS[id],
      }))}
    />
  );
}

export function PortalClient({
  kunde,
  leads,
  angebote,
  auftraege,
  initialVorgaenge,
  layout = "default",
  activeSection,
  showAnlassBadge = false,
  hideFilterBar = false,
  controlledVorgangFilter,
  controlledHvListeFilter,
  onVorgangFilterChange,
  onHvDetailOpenChange,
  onDetailReady,
  forceDetailId = null,
  hvPortalMode = false,
  kundeTyp: kundeTypProp,
  hausverwaltungBrand = null,
  mieterFeedbackByLeadId = {},
  hwErledigtByLeadId = {},
  hvFeedbackByLeadId = {},
  auftragIdByLeadId: auftragIdByLeadIdProp = {},
  hvAbnahmeByLeadId = {},
  bautagebuchByLeadId = {},
}: {
  kunde: PortalKunde;
  leads: PortalLead[];
  angebote: PortalAngebot[];
  auftraege: PortalAuftrag[];
  /** Server-seitig gebaute List-Items (schlank, ohne Medien). */
  initialVorgaenge?: KundePortalDetailItem[];
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
  /** HV: Partner-/HW-Updates je Lead (Listen-Payload strippt bautagebuch). */
  bautagebuchByLeadId?: Record<string, PortalBautagebuchEntry[]>;
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
  /** Detail fertig (Fetch) — Parent kann Nav-Hold lösen. */
  onDetailReady?: () => void;
  /**
   * Sofortige Detail-ID (z. B. Klick Startseite), ohne auf URL-searchParams zu warten.
   */
  forceDetailId?: string | null;
  onVorgangFilterChange?: (filter: KundeVorgangFilter) => void;
  /** Hausverwaltungs-Portal: CRM-Resolver mit role „hv“ (kein Mieter-Status). */
  hvPortalMode?: boolean;
  /** D7 / ENTSCHEIDUNG 2 — Kennung aus Stamm; Default aus portal_modus/typ. */
  kundeTyp?: PortalKundeTyp;
  /** Mieter-Portal: White-Label der Hausverwaltung (Desktop-Topbar). */
  hausverwaltungBrand?: MieterHvBrand | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const embedded = layout === "embedded";
  const { hold, release, flash: flashShellBusy } = usePortalBusy();
  const { refreshFlash } = usePortalRefresh();
  const detailHoldRef = useRef(false);

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
    () => forceDetailId?.trim() || searchParams.get("id")?.trim() || null
  );
  const [detailItem, setDetailItem] = useState<KundePortalDetailItem | null>(null);
  /** Detail-Titel (voller Funnel) → Liste, alle Filter/Phasen. */
  const [listTitleByKey, setListTitleByKey] = useState<Record<string, string>>(
    {}
  );
  /** Deep-Link mit `id`: sofort Loading, kein kurzer Flicker der Liste. */
  const [detailLoading, setDetailLoading] = useState(
    () =>
      Boolean(forceDetailId?.trim() || searchParams.get("id")?.trim())
  );
  const [listPage, setListPage] = useState(1);
  const [gptOpen, setGptOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [pageBusy, setPageBusy] = useState(false);
  /**
   * Nach „Zurück“: Detail-`id` in der URL ignorieren, bis die Listen-URL ohne id da ist.
   * Sonst flackert/hängt das alte Detail (HV + Kunde).
   */
  const ignoreUrlDetailRef = useRef(false);
  /** Beim Öffnen: veraltete URL-id vom vorherigen Detail verwerfen. */
  const pendingDetailIdRef = useRef<string | null>(null);

  function beginDetailBusy() {
    if (!detailHoldRef.current) {
      detailHoldRef.current = true;
      hold();
    }
    // Sofort painten — vor router.replace und vor URL-Sync-Effekt.
    flushSync(() => {
      setPageBusy(true);
      setDetailLoading(true);
    });
  }

  function endDetailBusy() {
    setDetailLoading(false);
    setPageBusy(false);
    if (detailHoldRef.current) {
      detailHoldRef.current = false;
      release();
    }
    onDetailReady?.();
  }

  function flashNavBusy(ms = PORTAL_BUSY_MIN_MS) {
    flashShellBusy(ms);
    paintPortalBusyNow(setPageBusy);
    window.setTimeout(() => setPageBusy(false), ms);
  }

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

  const vorgaengeItems = useMemo(() => {
    const base = initialVorgaenge?.length
      ? initialVorgaenge
      : buildKundeVorgaenge({
          leads,
          angebote,
          auftraege,
          hvPortalMode: hvPortalMode || isPrivatLike,
          mieterStatusMode: !hvPortalMode,
          mieterFeedbackByLeadId,
        });
    if (!Object.keys(listTitleByKey).length) return base;
    return base.map((item) => {
      const override =
        listTitleByKey[item.id] ??
        (item.leadId ? listTitleByKey[item.leadId] : undefined);
      if (!override || override === item.title) return item;
      return { ...item, title: override };
    });
  }, [
    initialVorgaenge,
    leads,
    angebote,
    auftraege,
    hvPortalMode,
    isPrivatLike,
    mieterFeedbackByLeadId,
    listTitleByKey,
  ]);

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
    return [...vorgaengeItems]
      .map((item) => {
        const flow = flowByItemId.get(item.id) ?? "gemeldet";
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
        hvMieterView: Boolean(item.hvMieterView),
        statusLabel: item.hvMieterView
          ? item.status || portalMieterStatusLabel(flow)
          : undefined,
      }));
  }, [vorgaengeItems, flowByItemId]);

  const cardRows = useMemo(() => {
    const rows = buildKundeVorgangCardRows(filteredVorgaenge, {
      mockListe: hvPortalMode || (isPrivatLike && !hvPortalMode),
    });
    // Flow-Status (HV/Privat-Chips) steuert die Primär-Sortierung, falls vorhanden.
    return [...rows]
      .map((row) => {
        const flow = flowByItemId.get(row.id);
        return {
          ...row,
          statusRank: flow ? portalFlowSortRank(flow) : row.statusRank,
        };
      })
      .sort(compareVorgangListOrder);
  }, [filteredVorgaenge, isPrivatLike, hvPortalMode, flowByItemId]);

  const listTotalPages = Math.max(1, Math.ceil(cardRows.length / PORTAL_LIST_PAGE_SIZE));
  const safeListPage = Math.min(listPage, listTotalPages);
  const paginatedRows = cardRows.slice(
    (safeListPage - 1) * PORTAL_LIST_PAGE_SIZE,
    safeListPage * PORTAL_LIST_PAGE_SIZE
  );

  const listSelectedItem = selectedId
    ? findKundeVorgangByQueryId(vorgaengeItems, selectedId) ??
      findKundeVorgangByQueryId(filteredVorgaenge, selectedId) ??
      null
    : null;

  const detailMatchesSelection = Boolean(
    detailItem &&
      selectedId &&
      (detailItem.id === selectedId ||
        detailItem.leadId === selectedId ||
        (listSelectedItem &&
          (detailItem.id === listSelectedItem.id ||
            (Boolean(detailItem.leadId) &&
              detailItem.leadId === listSelectedItem.leadId))))
  );
  /** Während Fetch kein Slim-Listen-Detail — sonst wirkt der Loader „zu spät“. */
  const selectedItemRaw = detailMatchesSelection
    ? detailItem
    : detailLoading
      ? null
      : listSelectedItem;

  const selectedItem = useMemo(() => {
    if (!selectedItemRaw) return null;
    return mergeBautagebuchOntoItem(selectedItemRaw, bautagebuchByLeadId);
  }, [selectedItemRaw, bautagebuchByLeadId]);

  /** Parent (Startseite) setzt forceDetailId sofort — nicht auf URL warten. */
  useLayoutEffect(() => {
    const forced = forceDetailId?.trim() || null;
    if (!forced) return;
    if (selectedId === forced) return;
    ignoreUrlDetailRef.current = false;
    pendingDetailIdRef.current = forced;
    beginDetailBusy();
    flushSync(() => {
      setDetailItem(null);
      setSelectedId(forced);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur bei forceDetailId
  }, [forceDetailId]);

  /** Vor Paint: kein Slim-Detail ohne Loader (URL-Deep-Link / Klick). */
  useLayoutEffect(() => {
    if (!selectedId) {
      setDetailLoading(false);
      return;
    }
    if (
      detailItem &&
      (detailItem.id === selectedId || detailItem.leadId === selectedId)
    ) {
      return;
    }
    setDetailLoading(true);
  }, [selectedId, detailItem]);

  useEffect(() => {
    if (!selectedId) {
      setDetailItem(null);
      setDetailLoading(false);
      setPageBusy(false);
      if (detailHoldRef.current) {
        detailHoldRef.current = false;
        release();
      }
      return;
    }
    let cancelled = false;
    beginDetailBusy();
    const started = Date.now();
    const q = hvPortalMode ? "?hv=1" : "";
    void fetch(`/api/portal/vorgaenge/${encodeURIComponent(selectedId)}${q}`)
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as { item?: KundePortalDetailItem };
      })
      .then((json) => {
        if (cancelled) return;
        if (json?.item) {
          setDetailItem(json.item);
          const t = json.item.title?.trim();
          if (t) {
            setListTitleByKey((prev) => {
              const next = { ...prev };
              next[json.item!.id] = t;
              const lid = json.item!.leadId?.trim();
              if (lid) next[lid] = t;
              return next;
            });
          }
        }
      })
      .catch(() => {
        /* Liste bleibt Fallback */
      })
      .finally(() => {
        const wait = Math.max(0, PORTAL_BUSY_MIN_MS - (Date.now() - started));
        window.setTimeout(() => {
          if (!cancelled) endDetailBusy();
        }, wait);
      });
    return () => {
      cancelled = true;
    };
    // begin/endDetailBusy stabil über Refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, hvPortalMode]);

  /** URL-/State-ID ohne Listen-Treffer und ohne Detail → nicht ewig „laden“. */
  useEffect(() => {
    if (!selectedId || listSelectedItem || detailMatchesSelection) return;
    if (detailLoading) return;
    if (!vorgaengeItems.length) return;
    pendingDetailIdRef.current = null;
    setSelectedId(null);
    setDetailItem(null);
  }, [
    selectedId,
    listSelectedItem,
    detailMatchesSelection,
    detailLoading,
    vorgaengeItems.length,
  ]);

  useEffect(() => {
    setListPage(1);
  }, [section, vorgangFilter, privatChip, controlledHvListeFilter]);

  /** Filterwechsel (nicht Initial-Mount): Detail schließen. */
  const filterKey = `${vorgangFilter}|${privatChip}|${controlledHvListeFilter ?? ""}`;
  const prevFilterKeyRef = useRef(filterKey);
  useEffect(() => {
    if (prevFilterKeyRef.current === filterKey) return;
    prevFilterKeyRef.current = filterKey;
    if (!selectedId) return;
    ignoreUrlDetailRef.current = true;
    pendingDetailIdRef.current = null;
    setDetailItem(null);
    setDetailLoading(false);
    setSelectedId(null);
    onHvDetailOpenChange?.(false);
  }, [filterKey, selectedId, onHvDetailOpenChange]);

  useEffect(() => {
    if (!hvPortalMode || !onHvDetailOpenChange) return;
    onHvDetailOpenChange(Boolean(selectedId));
  }, [hvPortalMode, onHvDetailOpenChange, selectedId]);

  useEffect(() => {
    const applyDetailFromUrl = (rawId: string | null | undefined) => {
      if (!rawId) {
        // Klick hat Detail schon gesetzt, router.replace noch unterwegs —
        // pending nicht verwerfen und Selection nicht zurücksetzen.
        if (pendingDetailIdRef.current) return;
        setSelectedId(null);
        return;
      }
      const pending = pendingDetailIdRef.current;
      if (pending && pending !== rawId) {
        const matchedPending = findKundeVorgangByQueryId(vorgaengeItems, pending);
        const matchedUrl = findKundeVorgangByQueryId(vorgaengeItems, rawId);
        const pendingCanon = matchedPending?.id ?? pending;
        const urlCanon = matchedUrl?.id ?? rawId;
        if (pendingCanon !== urlCanon && pending !== rawId) {
          // Noch alte Detail-URL, neuer Klick ist schon unterwegs — warten.
          return;
        }
      }
      const matched = findKundeVorgangByQueryId(vorgaengeItems, rawId);
      if (matched) {
        if (pending && (pending === matched.id || pending === rawId)) {
          pendingDetailIdRef.current = null;
        }
        if (
          !(
            detailItem &&
            (detailItem.id === matched.id || detailItem.leadId === matched.id)
          )
        ) {
          setDetailLoading(true);
        }
        setSelectedId(matched.id);
        return;
      }
      // Unbekannte id: nicht in Endlos-Ladezustand gehen (Filter-/Race-Reste).
      if (vorgaengeItems.length > 0) {
        pendingDetailIdRef.current = null;
        setDetailLoading(false);
        setSelectedId(null);
        return;
      }
      if (pending && pending === rawId) {
        pendingDetailIdRef.current = null;
      }
      setDetailLoading(true);
      setSelectedId(rawId);
    };

    if (embedded) {
      if (!hvPortalMode) return;
      const itemId = searchParams.get("id")?.trim() || null;
      if (ignoreUrlDetailRef.current) {
        // Nach Zurück/Filter: Detail nicht aus veralteter URL wieder öffnen.
        setSelectedId(null);
        if (!itemId) {
          ignoreUrlDetailRef.current = false;
          pendingDetailIdRef.current = null;
        }
        return;
      }
      applyDetailFromUrl(itemId);
      return;
    }

    const rawSection = searchParams.get("section")?.trim();
    const normalized = normalizeSectionFromUrl(rawSection);
    const rawId = searchParams.get("id")?.trim() || null;

    if (ignoreUrlDetailRef.current) {
      setSelectedId(null);
      if (normalized === "vorgaenge" && !rawId) {
        ignoreUrlDetailRef.current = false;
        pendingDetailIdRef.current = null;
        setSection("vorgaenge");
      }
      return;
    }

    if (!rawSection) return;
    if (!normalized) return;

    setSection(normalized);
    if (normalized === "vorgaenge") {
      applyDetailFromUrl(rawId);
    }
    // detailItem bewusst nicht in deps: setDetailItem(null) beim Öffnen
    // darf den URL-Sync nicht mit alter URL ohne id neu anstoßen.
  }, [searchParams, vorgaengeItems, embedded, hvPortalMode]);

  /** Vorgang öffnen = zugehörige Portal-Benachrichtigungen gelesen. */
  useEffect(() => {
    if (!selectedId || hvPortalMode) return;
    const matched = findKundeVorgangByQueryId(vorgaengeItems, selectedId);
    const refs = [selectedId.replace(/^auftrag:/, "")];
    if (matched?.id && matched.id !== refs[0]) refs.push(matched.id);
    void fetch("/api/portal/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vorgangRef: refs }),
    }).then(() => emitPortalNotificationsChanged());
  }, [selectedId, vorgaengeItems, hvPortalMode]);

  /** Notification-Klick: Detail öffnen, auch wenn ignoreUrlDetailRef gesetzt war. */
  function openVorgangFromNotification(vorgangId: string, href?: string) {
    ignoreUrlDetailRef.current = false;
    const matched = findKundeVorgangByQueryId(vorgaengeItems, vorgangId);
    const id = matched?.id ?? vorgangId;
    pendingDetailIdRef.current = id;
    beginDetailBusy();
    flushSync(() => {
      setDetailItem(null);
      setSection("vorgaenge");
      setSelectedId(id);
    });
    onHvDetailOpenChange?.(true);
    const target =
      ensurePortalVorgangNotificationHref({
        href: href ?? null,
        vorgangId: id,
      }) ||
      `/portal?section=vorgaenge&id=${encodeURIComponent(id)}`;
    if (embedded && hvPortalMode) {
      const f = hvListeFilterForUrl();
      try {
        const u = new URL(target, "https://local.invalid");
        u.searchParams.set("section", "vorgaenge");
        u.searchParams.set("filter", f);
        u.searchParams.set("id", id);
        router.push(`${u.pathname}${u.search}${u.hash}`);
      } catch {
        router.push(target);
      }
      return;
    }
    if (!embedded || href) {
      router.push(target);
    }
  }

  function switchSection(next: SectionId) {
    ignoreUrlDetailRef.current = true;
    pendingDetailIdRef.current = null;
    if (detailHoldRef.current) {
      detailHoldRef.current = false;
      release();
    }
    setDetailLoading(false);
    setDetailItem(null);
    setPageBusy(false);
    flushSync(() => {
      setSection(next);
      setSelectedId(null);
    });
    flashNavBusy();
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

  /** Sofort Loading + Detail öffnen (Liste, Dashboard, Deeplink-Hilfen). */
  function openVorgangById(vorgangId: string) {
    ignoreUrlDetailRef.current = false;
    const matched = findKundeVorgangByQueryId(vorgaengeItems, vorgangId);
    const id = matched?.id ?? vorgangId.trim();
    if (!id) return;
    pendingDetailIdRef.current = id;
    // Loading muss vor router.replace sichtbar sein (sonst Sekunden ohne Feedback).
    beginDetailBusy();
    flushSync(() => {
      setDetailItem(null);
      setSection("vorgaenge");
      setSelectedId(id);
    });
    onHvDetailOpenChange?.(true);
    if (embedded && hvPortalMode) {
      const f = hvListeFilterForUrl();
      router.replace(
        `/portal?section=vorgaenge&filter=${f}&id=${encodeURIComponent(id)}`,
        { scroll: false }
      );
    } else if (!embedded) {
      router.replace(
        `/portal?section=vorgaenge&id=${encodeURIComponent(id)}`,
        { scroll: false }
      );
    }
  }

  function openVorgang(row: PortalCardRow) {
    openVorgangById(row.id);
  }

  function closeDetail() {
    ignoreUrlDetailRef.current = true;
    pendingDetailIdRef.current = null;
    if (detailHoldRef.current) {
      detailHoldRef.current = false;
      release();
    }
    setDetailItem(null);
    setDetailLoading(false);
    setPageBusy(false);
    setSelectedId(null);
    flashNavBusy();
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
    const rowBt = mergeBautagebuchForListRow(row, bautagebuchByLeadId);
    const btUnread =
      clientReady && hvPortalMode && !mieterStatus && rowBt?.length
        ? countUnreadBautagebuch(rowBt, getBautagebuchLastSeenAt(leadKey))
        : 0;

    return (
      <PortalListCard
        key={row.id}
        variant="responsive"
        selected={false}
        onClick={() => openVorgang(row)}
        title={row.title}
        subtitle={row.subtitle}
        statusLabel={statusLabel}
        statusPillClass={portalDetailStatusPillClass(row.statusPillKey)}
        statusPillStyle={statusPillStyle}
        accent={row.accent}
        meta={row.meta}
        hint={hvPortalMode || !mockListe ? row.hint : undefined}
        footer={mockListe ? undefined : row.footer}
        showLeftAccent={false}
        showChevron
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
          <PortalListeFilterBar
            value={privatChip}
            onChange={setPrivatChip}
            sheetTitle="Liste"
            options={PRIVAT_LISTE_CHIPS.map((chip) => ({
              id: chip.id,
              label: chip.label,
            }))}
          />
        </>
      ) : !hideFilterBar ? (
        <VorgangListFilterBar
          filter={vorgangFilter}
          onFilterChange={setVorgangFilter}
        />
      ) : null}
      <div className={portalListStackClass("responsive")}>
        {paginatedRows.length === 0 ? (
          vorgaengeItems.length === 0 ? (
            <PortalEmptyState
              role={
                hvPortalMode ? "hv" : isPrivatLike ? "mieter" : "kunde"
              }
              compact
            />
          ) : (
            <PortalInboxEmpty
              compact
              title={
                hvPortalMode && controlledHvListeFilter
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
                        : "Keine erledigten Vorgänge."
              }
            />
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

  /**
   * Loader solange detailLoading (Klick setzt sofort true, Fetch hält min. PORTAL_BUSY_MIN_MS).
   * Kein vorzeitiges Slim-Listen-Detail.
   */
  const showDetailBusy = Boolean(selectedId && detailLoading);

  const detailScreen = showDetailBusy ? (
    <PortalContentBusy
      title="Vorgang wird geladen…"
      body="Einen Moment — wir öffnen die Details."
    />
  ) : selectedItem ? (
    <div className="-mx-4 -mt-4 min-w-0 lg:-mx-6 lg:-mt-5">
      <PortalVorgangDetail
        item={selectedItem}
        showAnlassBadge={showAnlassBadge}
        onAccepted={() => refreshFlash()}
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
          )?.org_freigabe_status ??
          selectedItem?.orgFreigabeStatus ??
          null
        }
        freigabeBypassGrund={
          ((leads as Array<{
            id: string;
            freigabe_bypass_grund?: string | null;
          }>).find((l) => l.id === selectedLeadId)
            ?.freigabe_bypass_grund as "schwelle" | "akut" | null | undefined) ??
          (selectedItem?.freigabeBypassGrund as
            | "schwelle"
            | "akut"
            | null
            | undefined) ??
          null
        }
        hvMeldungStatus={
          (leads as Array<{ id: string; hv_meldung_status?: string | null }>).find(
            (l) => l.id === selectedLeadId
          )?.hv_meldung_status ?? null
        }
        schwelleEur={kunde.freigabe_schwelle_eur ?? undefined}
        onHvFeedbackSubmitted={() => refreshFlash()}
        onBack={closeDetail}
      />
    </div>
  ) : selectedId ? (
    <PortalContentBusy
      title="Vorgang wird geladen…"
      body="Einen Moment — wir öffnen die Details."
    />
  ) : null;

  /** Mock: Liste und Detail sind getrennte Screens — kein Split-Pane. */
  const vorgaengeScreen =
    selectedItem || selectedId || showDetailBusy ? detailScreen : listPanel;

  if (embedded) {
    const showEmbeddedBusy = Boolean(pageBusy || showDetailBusy);
    return (
      <div className="relative min-h-[40vh] min-w-0">
        <div
          className={cn(
            showEmbeddedBusy && "pointer-events-none invisible select-none"
          )}
          aria-hidden={showEmbeddedBusy || undefined}
        >
          {vorgaengeScreen}
        </div>
        {showEmbeddedBusy ? (
          <div className="absolute inset-0 z-10 flex items-start justify-center bg-[var(--surface-page,#f7f8fa)]/90 backdrop-blur-[1px]">
            <PortalContentBusy
              title="Vorgang wird geladen…"
              body="Einen Moment — wir öffnen die Details."
            />
          </div>
        ) : null}
      </div>
    );
  }

  const navRole = portalNavRoleForKundeTyp(kundeTyp);
  const hvBrand = !hvPortalMode ? hausverwaltungBrand : null;
  const brandTitle = hvBrand?.name?.trim() || "MeinBärenwald";
  const brandSubtitle = hvBrand
    ? hvBrand.sub?.trim() || "Verwaltung"
    : kunde.name?.trim() || "Kundenportal";

  return (
    <>
      <PortalShell
        variant="kunde"
        brandTitle={brandTitle}
        brandSubtitle={brandSubtitle}
        brandLogoUrl={hvBrand?.logoUrl}
        brandKuerzel={hvBrand?.logoKuerzel ?? (hvBrand ? null : "B")}
        brandPrimary={hvBrand?.primary}
        brandPrimaryDk={hvBrand?.primaryDk}
        brandSoft={hvBrand?.soft}
        sidebarOwner={hvBrand?.name?.trim() || kunde.name?.trim() || "MeinBärenwald"}
        hideMobileChrome={section === "gpt"}
        activeNavId={section === "gpt" ? "uebersicht" : section}
        contentKey={`${section}:${privatChip ?? ""}:${controlledHvListeFilter ?? controlledVorgangFilter ?? ""}`}
        contentBusy={pageBusy || detailLoading}
        contentBusyTitle={
          detailLoading || pageBusy ? "Vorgang wird geladen…" : undefined
        }
        contentBusyBody={
          detailLoading || pageBusy
            ? "Einen Moment — wir öffnen die Details."
            : undefined
        }
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
            <PortalUserNotificationBell
              role="kunde"
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
          {section === "gpt" ? (
            <article className="portal-surface overflow-hidden p-0">
              <PortalBaerenwaldGpt
                variant="embedded"
                open
                onClose={() => switchSection("uebersicht")}
              />
            </article>
          ) : null}

          {section === "profil" ? (
            hvBrand ? (
              <PortalEinstellungenMieter
                name={kunde.name}
                email={kunde.email}
                telefon={kunde.telefon}
                orgName={hvBrand.name}
                orgMail={hvBrand.mail}
              />
            ) : (
              <PortalEinstellungenPrivat
                name={kunde.name}
                email={kunde.email}
                telefon={kunde.telefon}
                kundeTyp={kundeTyp === "gewerbe" ? "gewerbe" : "privat"}
              />
            )
          ) : null}

          {section === "uebersicht" && isPrivatLike ? (
            <PortalKundePrivatDashboard
              hello={portalKundeDashboardHello(kundeTyp, kunde.name)}
              profileName={kunde.name?.trim() || "MeinBärenwald"}
              kundeTyp={kundeTyp === "gewerbe" ? "gewerbe" : "privat"}
              kpis={privatKpis}
              recent={recentItems}
              heroImageUrl={portalHeaderHeroSrc("mieter")}
              onOpenAll={() => {
                setPrivatChip("alle");
                setVorgangFilter("alle");
                flushSync(() => setSection("vorgaenge"));
                flashNavBusy();
                if (!embedded) {
                  router.replace("/portal?section=vorgaenge&filter=alle", {
                    scroll: false,
                  });
                }
              }}
              onKpiClick={(id) => {
                setPrivatChip(privatKpiToListeChip(id));
                switchSection("vorgaenge");
              }}
              onOpenItem={(id) => openVorgangById(id)}
            />
          ) : null}

          {section === "uebersicht" && !isPrivatLike ? (
            <PortalKundePrivatDashboard
              hello={portalKundeDashboardHello(kundeTyp, kunde.name)}
              profileName={kunde.name?.trim() || "MeinBärenwald"}
              kundeTyp="privat"
              kpis={privatKpis}
              recent={recentItems}
              heroImageUrl={portalHeaderHeroSrc("mieter")}
              onOpenAll={() => {
                setPrivatChip("alle");
                setVorgangFilter("alle");
                flushSync(() => setSection("vorgaenge"));
                flashNavBusy();
                if (!embedded) {
                  router.replace("/portal?section=vorgaenge&filter=alle", {
                    scroll: false,
                  });
                }
              }}
              onKpiClick={(id) => {
                setPrivatChip(privatKpiToListeChip(id));
                switchSection("vorgaenge");
              }}
              onOpenItem={(id) => openVorgangById(id)}
            />
          ) : null}

          {section === "vorgaenge" ? vorgaengeScreen : null}

          {section !== "gpt" ? (
            <PortalLegalFooter variant="kunde" />
          ) : null}
      </PortalShell>

      {gptOpen && section !== "gpt" ? (
        <PortalBaerenwaldGpt open onClose={() => setGptOpen(false)} />
      ) : null}

      <PortalCreateFunnelModal
        open={createOpen}
        channel={portalClientCreateChannel({
          hvPortalMode,
          kundeTyp,
          navRole,
        })}
        title={portalCreateLabel(navRole)}
        prefill={fabContactPrefill}
        onClose={() => setCreateOpen(false)}
        onDone={() => {
          setCreateOpen(false);
          refreshFlash();
        }}
      />

    </>
  );
}
