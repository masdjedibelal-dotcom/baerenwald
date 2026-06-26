"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  CalendarDays,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Mail,
  MessageCircle,
  MessagesSquare,
  Phone,
  User,
} from "lucide-react";

import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import "@/components/onboarding/onboarding.css";
import { PartnerAnfrageDetail } from "@/components/partner/PartnerAnfrageDetail";
import { PartnerPlanerPanel } from "@/components/partner/PartnerPlanerPanel";
import { PartnerProfilPanel } from "@/components/partner/PartnerProfilPanel";
import { PartnerAngebotDetail } from "@/components/partner/PartnerAngebotDetail";
import { PartnerAuftragAnfrageDetail } from "@/components/partner/PartnerAuftragAnfrageDetail";
import { PartnerAuftragDetail } from "@/components/partner/PartnerAuftragDetail";
import { PartnerListCard } from "@/components/partner/PartnerListCard";
import { PortalAuftragPhasenStrip } from "@/components/shared/PortalAuftragPhasenStrip";
import { PortalMobileBottomSheet } from "@/components/shared/PortalMobileBottomSheet";
import {
  PARTNER_LIST_PAGE_SIZE,
  PartnerListPagination,
} from "@/components/partner/PartnerListPagination";
import { PORTAL_OVERVIEW_PAGE_SIZE } from "@/components/shared/PortalListPagination";
import { PortalBaerenwaldGpt } from "@/components/portal/PortalBaerenwaldGpt";
import { PortalLegalFooter } from "@/components/shared/PortalLegalFooter";
import { PortalNavCountBadge, portalNavBadgeCount } from "@/components/shared/PortalNavCountBadge";
import { SITE_CONFIG } from "@/lib/config";
import { isOnboardingCompleted } from "@/lib/onboarding/storage";
import { PARTNER_ONBOARDING_SLIDES } from "@/lib/onboarding/partner-slides";
import type {
  PartnerAnfrageItem,
  PartnerAuftragItem,
  PartnerHandwerkerProfil,
  PartnerProfilKontext,
  PartnerTerminItem,
  PartnerAufgabeItem,
  PartnerTodoItem,
} from "@/lib/partner/get-partner-data";
import {
  angebotPhaseSortKey,
  buildAnfragenCardRows,
  mapAngebotToCard,
  mapAuftragToCard,
  partnerAngebotStatusPillClass,
  type PartnerCardRow,
} from "@/lib/partner/partner-list-mappers";
import {
  formatHandwerkerBewertung,
  HANDWERKER_BEWERTUNG_KATEGORIEN,
} from "@/lib/partner/handwerker-bewertung-display";
import { isPartnerAnfrageAktionErforderlich, isPartnerAuftragAnfrageAktionErforderlich } from "@/lib/partner/partner-anfrage-status";
import {
  countPartnerAnfragenFilter,
  countPartnerAngeboteFilter,
  countPartnerAuftraegeFilter,
  filterPartnerAnfragenListen,
  isPartnerAngebotListItemOffen,
  isPartnerAuftragListItemOffen,
  type PartnerListFilterId,
} from "@/lib/partner/partner-list-filters";
import { cn } from "@/lib/utils";
import { partnerAnfragePortalPath, partnerAngebotPortalPath } from "@/lib/partner/partner-site-url";
import { resolveAngebotHandwerkerPhase } from "@/lib/partner/partner-portal-phase";

type PartnerSection =
  | "uebersicht"
  | "profil"
  | "planer"
  | "anfragen"
  | "angebote"
  | "auftraege"
  | "gpt";
type OverviewTabId = "anfragen" | "angebote" | "auftraege";

const MENU_ITEMS: Array<{
  id: PartnerSection;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: "uebersicht", label: "Übersicht", icon: LayoutDashboard },
  { id: "anfragen", label: "Anfragen", icon: ClipboardList },
  { id: "angebote", label: "Angebote", icon: FileText },
  { id: "auftraege", label: "Aufträge", icon: Briefcase },
  { id: "gpt", label: "GPT", icon: MessagesSquare },
  { id: "planer", label: "Planer", icon: CalendarDays },
  { id: "profil", label: "Profil", icon: User },
];

const MOBILE_NAV_ITEMS = [
  "uebersicht",
  "anfragen",
  "angebote",
  "auftraege",
  "planer",
  "profil",
] as const satisfies readonly PartnerSection[];

function statusPillClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "akzeptiert" || s === "eingereicht" || s === "abgeschlossen") {
    return "tag bg-emerald-100 text-emerald-700";
  }
  if (s === "abgelehnt" || s === "storniert") return "tag bg-red-100 text-red-700";
  if (s === "antwort_abgelaufen") return "tag bg-red-100 text-red-700";
  if (s === "in_arbeit") return "tag bg-blue-100 text-blue-800";
  return "tag bg-amber-100 text-amber-700";
}

function isAuftragAktiv(a: PartnerAuftragItem): boolean {
  const s = a.status.toLowerCase();
  return s !== "abgeschlossen" && s !== "storniert";
}

function sortAnfragen(items: PartnerAnfrageItem[]): PartnerAnfrageItem[] {
  return [...items].sort((a, b) => {
    const aAktion = isPartnerAnfrageAktionErforderlich(a) ? 1 : 0;
    const bAktion = isPartnerAnfrageAktionErforderlich(b) ? 1 : 0;
    if (aAktion !== bAktion) return bAktion - aAktion;
    return (
      new Date(b.gesendet_at || 0).getTime() - new Date(a.gesendet_at || 0).getTime()
    );
  });
}

function firstAnfrageId(
  angeboteHw: PartnerAnfrageItem[],
  auftragHw: PartnerAuftragItem[]
): string | null {
  const sorted = sortAnfragen(angeboteHw);
  if (sorted[0]) return sorted[0].id;
  if (auftragHw[0]) return `auftrag:${auftragHw[0].id}`;
  return null;
}

function parseAnfragenSelectedId(
  selectedId: string | null
): { kind: "angebot"; id: string } | { kind: "auftrag"; id: string } | null {
  if (!selectedId) return null;
  if (selectedId.startsWith("auftrag:")) {
    return { kind: "auftrag", id: selectedId.slice("auftrag:".length) };
  }
  return { kind: "angebot", id: selectedId };
}

function emptyLabelForTab(tab: OverviewTabId): string {
  if (tab === "anfragen") return "Noch keine Anfragen";
  if (tab === "angebote") return "Noch keine Angebote";
  return "Noch keine Aufträge";
}

function PartnerListFilterBar({
  filter,
  onFilterChange,
  counts,
}: {
  filter: PartnerListFilterId;
  onFilterChange: (filter: PartnerListFilterId) => void;
  counts: Pick<Record<PartnerListFilterId, number>, "offen" | "geschlossen">;
}) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-border-default px-3 py-3 sm:px-4">
      {(
        [
          ["offen", "Offen"],
          ["geschlossen", "Geschlossen"],
        ] as const
      ).map(([id, label]) => (
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
          {label}
          <span className="ml-1.5 text-text-tertiary">({counts[id]})</span>
        </button>
      ))}
    </div>
  );
}

export function PartnerClient({
  handwerker,
  profil,
  termine,
  aufgaben,
  anfragen,
  angebote,
  angeboteAlleAkzeptiert,
  auftragAnfragen,
  auftraege,
}: {
  handwerker: PartnerHandwerkerProfil;
  profil: PartnerProfilKontext;
  termine: PartnerTerminItem[];
  aufgaben: PartnerAufgabeItem[];
  /** @deprecated Eigene Todos entfallen zugunsten systemischer Aufgaben */
  todos?: PartnerTodoItem[];
  /** Offene angebot_handwerker-Anfragen (Server-Filter). */
  anfragen: PartnerAnfrageItem[];
  /** Akzeptiert, hw_status !== uebernommen (Server-Filter). */
  angebote: PartnerAnfrageItem[];
  /** Alle akzeptierten HW-Angebote inkl. übernommen (Deep-Link). */
  angeboteAlleAkzeptiert: PartnerAnfrageItem[];
  /** Auftrag mit status offen / HW noch ausstehend (Server-Filter). */
  auftragAnfragen: PartnerAuftragItem[];
  /** Laufende Aufträge (Server-Filter). */
  auftraege: PartnerAuftragItem[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [section, setSection] = useState<PartnerSection>("uebersicht");
  const [overviewTab, setOverviewTab] = useState<OverviewTabId>("anfragen");
  const [overviewPage, setOverviewPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    firstAnfrageId(anfragen, auftragAnfragen)
  );
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [gptOpen, setGptOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  useEffect(() => {
    if (!isOnboardingCompleted("partner")) {
      setOnboardingOpen(true);
    }
  }, []);
  const [bewertungExpanded, setBewertungExpanded] = useState(false);
  const [listPage, setListPage] = useState(1);
  const [listFilter, setListFilter] = useState<PartnerListFilterId>("offen");

  const vorname = handwerker.vorname || "Partner";

  const offeneAnfragenCount =
    anfragen.filter(isPartnerAnfrageAktionErforderlich).length +
    auftragAnfragen.filter(isPartnerAuftragAnfrageAktionErforderlich).length;

  const anfragenSorted = useMemo(() => sortAnfragen(anfragen), [anfragen]);

  const angeboteSorted = useMemo(() => {
    return [...angebote].sort((a, b) => {
      const phaseDiff = angebotPhaseSortKey(a) - angebotPhaseSortKey(b);
      if (phaseDiff !== 0) return phaseDiff;
      return (
        new Date(b.antwort_at || b.gesendet_at || 0).getTime() -
        new Date(a.antwort_at || a.gesendet_at || 0).getTime()
      );
    });
  }, [angebote]);

  const offeneAngeboteCount = angebote.filter(isPartnerAngebotListItemOffen).length;

  const aktiveAuftraegeCount = auftraege.filter(isAuftragAktiv).length;

  const anfragenCardRows = useMemo(
    () => buildAnfragenCardRows(anfragenSorted, auftragAnfragen),
    [anfragenSorted, auftragAnfragen]
  );

  const angeboteCardRows = useMemo(
    () => angeboteSorted.map(mapAngebotToCard),
    [angeboteSorted]
  );

  const auftraegeCardRows = useMemo(() => {
    return [...auftraege]
      .sort(
        (a, b) =>
          new Date(b.start_datum || 0).getTime() -
          new Date(a.start_datum || 0).getTime()
      )
      .map(mapAuftragToCard);
  }, [auftraege]);

  const sectionCardRows = useMemo((): PartnerCardRow[] => {
    if (section === "anfragen") {
      const filtered = filterPartnerAnfragenListen(
        anfragenSorted,
        auftragAnfragen,
        listFilter
      );
      return buildAnfragenCardRows(filtered.anfragen, filtered.auftragAnfragen);
    }
    if (section === "angebote") {
      const items = angeboteSorted.filter((a) =>
        listFilter === "offen"
          ? isPartnerAngebotListItemOffen(a)
          : !isPartnerAngebotListItemOffen(a)
      );
      return items.map(mapAngebotToCard);
    }
    if (section === "auftraege") {
      const items = [...auftraege]
        .sort(
          (a, b) =>
            new Date(b.start_datum || 0).getTime() -
            new Date(a.start_datum || 0).getTime()
        )
        .filter((a) =>
          listFilter === "offen"
            ? isPartnerAuftragListItemOffen(a)
            : !isPartnerAuftragListItemOffen(a)
        );
      return items.map(mapAuftragToCard);
    }
    return [];
  }, [
    section,
    listFilter,
    anfragenSorted,
    auftragAnfragen,
    angeboteSorted,
    auftraege,
  ]);

  const listFilterCounts = useMemo((): Record<PartnerListFilterId, number> => {
    if (section === "anfragen") {
      return countPartnerAnfragenFilter(anfragenSorted, auftragAnfragen);
    }
    if (section === "angebote") {
      return countPartnerAngeboteFilter(angeboteSorted);
    }
    if (section === "auftraege") {
      return countPartnerAuftraegeFilter(auftraege);
    }
    return { offen: 0, geschlossen: 0 };
  }, [section, anfragenSorted, auftragAnfragen, angeboteSorted, auftraege]);

  const listTotalPages = Math.max(
    1,
    Math.ceil(sectionCardRows.length / PARTNER_LIST_PAGE_SIZE)
  );
  const safeListPage = Math.min(listPage, listTotalPages);
  const paginatedCardRows = sectionCardRows.slice(
    (safeListPage - 1) * PARTNER_LIST_PAGE_SIZE,
    safeListPage * PARTNER_LIST_PAGE_SIZE
  );

  const listItemLabel =
    section === "anfragen"
      ? "Anfragen"
      : section === "angebote"
        ? "Angebote"
        : "Aufträge";

  useEffect(() => {
    setListPage(1);
  }, [section, listFilter]);

  useEffect(() => {
    if (
      section !== "anfragen" &&
      section !== "angebote" &&
      section !== "auftraege"
    ) {
      return;
    }
    if (!selectedId || sectionCardRows.some((r) => r.id === selectedId)) return;
    if (
      section === "angebote" &&
      anfragenSorted.some((a) => a.id === selectedId)
    ) {
      return;
    }
    setSelectedId(sectionCardRows[0]?.id ?? null);
  }, [
    section,
    sectionCardRows,
    selectedId,
    anfragenSorted,
  ]);

  const overviewCardRows = useMemo((): PartnerCardRow[] => {
    if (overviewTab === "anfragen") return anfragenCardRows;
    if (overviewTab === "angebote") return angeboteCardRows;
    return auftraegeCardRows;
  }, [overviewTab, anfragenCardRows, angeboteCardRows, auftraegeCardRows]);

  const overviewTotalPages = Math.max(
    1,
    Math.ceil(overviewCardRows.length / PORTAL_OVERVIEW_PAGE_SIZE)
  );
  const overviewSafePage = Math.min(overviewPage, overviewTotalPages);
  const paginatedOverviewCardRows = overviewCardRows.slice(
    (overviewSafePage - 1) * PORTAL_OVERVIEW_PAGE_SIZE,
    overviewSafePage * PORTAL_OVERVIEW_PAGE_SIZE
  );

  useEffect(() => {
    setOverviewPage(1);
  }, [overviewTab]);

  const selectedAnfrageParsed = parseAnfragenSelectedId(selectedId);

  const selectedAnfrageAngebot = useMemo(
    () =>
      selectedAnfrageParsed?.kind === "angebot"
        ? (anfragenSorted.find((a) => a.id === selectedAnfrageParsed.id) ??
          anfragenSorted[0])
        : selectedAnfrageParsed?.kind !== "auftrag"
          ? anfragenSorted[0]
          : undefined,
    [anfragenSorted, selectedAnfrageParsed]
  );

  useEffect(() => {
    if (section !== "anfragen" || !selectedAnfrageAngebot) return;
    if (resolveAngebotHandwerkerPhase(selectedAnfrageAngebot) === "angebot") {
      setSection("angebote");
      setListFilter("offen");
      setSelectedId(selectedAnfrageAngebot.id);
      router.replace(partnerAngebotPortalPath(selectedAnfrageAngebot.id));
    }
  }, [section, selectedAnfrageAngebot, router]);

  const selectedAnfrageAuftrag = useMemo(
    () =>
      selectedAnfrageParsed?.kind === "auftrag"
        ? (auftragAnfragen.find((a) => a.id === selectedAnfrageParsed.id) ??
          auftragAnfragen[0])
        : !selectedAnfrageAngebot && auftragAnfragen[0]
          ? auftragAnfragen[0]
          : undefined,
    [auftragAnfragen, selectedAnfrageParsed, selectedAnfrageAngebot]
  );

  const selectedAngebot = useMemo(() => {
    if (selectedId) {
      return angeboteSorted.find((a) => a.id === selectedId);
    }
    return angeboteSorted[0];
  }, [angeboteSorted, selectedId]);

  useEffect(() => {
    if (section !== "angebote" || !selectedId) return;
    if (angeboteSorted.some((a) => a.id === selectedId)) return;
    if (anfragenSorted.some((a) => a.id === selectedId)) {
      router.replace(partnerAnfragePortalPath(selectedId));
      setSection("anfragen");
      setMobileDetailOpen(true);
      return;
    }
    router.refresh();
  }, [section, selectedId, angeboteSorted, anfragenSorted, router]);

  const selectedAuftrag = useMemo(
    () => auftraege.find((a) => a.id === selectedId) ?? auftraege[0],
    [auftraege, selectedId]
  );

  useEffect(() => {
    const s = searchParams.get("section")?.trim();
    if (!s) return;

    if (s === "profil" || s === "unterlagen") {
      setSection("profil");
      setMobileDetailOpen(false);
      return;
    }

    if (s === "planer") {
      setSection("planer");
      setMobileDetailOpen(false);
      return;
    }

    if (s === "auftraege") {
      const auftragId =
        searchParams.get("auftrag")?.trim() || searchParams.get("id")?.trim();
      if (!auftragId || auftragId.startsWith("auftrag:")) return;
      setSection("auftraege");
      if (auftraege.some((a) => a.id === auftragId)) {
        setSelectedId(auftragId);
        setMobileDetailOpen(true);
      }
      return;
    }

    if (s === "angebote") {
      const id = searchParams.get("id")?.trim();
      setSection("angebote");
      if (id) {
        if (angeboteSorted.some((a) => a.id === id)) {
          setSelectedId(id);
          setMobileDetailOpen(true);
          return;
        }
        if (anfragenSorted.some((a) => a.id === id)) {
          router.replace(partnerAnfragePortalPath(id));
          setSection("anfragen");
          setSelectedId(id);
          setMobileDetailOpen(true);
          return;
        }
        setSelectedId(id);
        setMobileDetailOpen(true);
      }
      return;
    }

    if (s === "anfragen") {
      const rawId = searchParams.get("id")?.trim();
      setSection("anfragen");
      if (!rawId) return;

      const auftragIdFromParam = rawId.startsWith("auftrag:")
        ? rawId.slice("auftrag:".length)
        : rawId;

      if (anfragen.some((a) => a.id === rawId)) {
        setSelectedId(rawId);
        setMobileDetailOpen(true);
        return;
      }
      if (
        rawId.startsWith("auftrag:") &&
        auftragAnfragen.some((a) => a.id === auftragIdFromParam)
      ) {
        setSelectedId(rawId);
        setMobileDetailOpen(true);
        return;
      }
      if (auftragAnfragen.some((a) => a.id === auftragIdFromParam)) {
        setSelectedId(`auftrag:${auftragIdFromParam}`);
        setMobileDetailOpen(true);
        return;
      }

      const auftragItem =
        auftraege.find((a) => a.id === auftragIdFromParam) ??
        auftragAnfragen.find((a) => a.id === auftragIdFromParam);
      const angebotHwId = auftragItem?.angebotHandwerkerId;
      if (angebotHwId) {
        if (angeboteSorted.some((a) => a.id === angebotHwId)) {
          setSection("angebote");
          setSelectedId(angebotHwId);
          setMobileDetailOpen(true);
          return;
        }
        if (anfragenSorted.some((a) => a.id === angebotHwId)) {
          setSection("anfragen");
          setSelectedId(angebotHwId);
          setMobileDetailOpen(true);
          return;
        }
      }

      setSection("uebersicht");
      setSelectedId(null);
      setMobileDetailOpen(false);
    }
  }, [searchParams, auftraege, anfragenSorted, angeboteSorted, auftragAnfragen, router]);

  function navigateFromPlaner(
    target: PartnerTerminItem["section"],
    selectedId?: string
  ) {
    setSection(target);
    setListPage(1);
    setListFilter("offen");
    if (selectedId) {
      setSelectedId(selectedId);
      if (target !== "profil") setMobileDetailOpen(true);
    }
  }

  function refreshAnfrageAfterRespond(anfrageId: string) {
    const id = anfrageId.trim();
    if (!id) return;
    setSection("anfragen");
    setListPage(1);
    setListFilter("offen");
    setSelectedId(id);
    setMobileDetailOpen(true);
    router.replace(partnerAnfragePortalPath(id));
    router.refresh();
  }

  function switchSection(id: PartnerSection) {
    setSection(id);
    setListPage(1);
    setListFilter("offen");
    setMobileDetailOpen(false);
    if (id !== "gpt") setGptOpen(false);
    if (id === "uebersicht" || id === "gpt" || id === "profil" || id === "planer") return;
    if (id === "anfragen") setSelectedId(firstAnfrageId(anfragen, auftragAnfragen));
    else if (id === "angebote") setSelectedId(angeboteSorted[0]?.id ?? null);
    else if (id === "auftraege") setSelectedId(auftraege[0]?.id ?? null);
  }

  function openFromOverview(tab: OverviewTabId, id: string) {
    setSelectedId(id);
    setSection(tab);
    setMobileDetailOpen(true);
  }

  function selectRow(id: string) {
    setSelectedId(id);
    setMobileDetailOpen(true);
  }

  const waNumber = SITE_CONFIG.phoneMobil.replace(/\D/g, "");
  const waHref = `https://wa.me/${waNumber}?text=${encodeURIComponent(
    "Hallo Bärenwald, ich habe eine Frage zum Partner-Portal."
  )}`;

  const listTotalCount = listFilterCounts.offen + listFilterCounts.geschlossen;
  const emptyMessage =
    listTotalCount === 0
      ? section === "anfragen"
        ? "Keine Anfragen — du wirst per E-Mail benachrichtigt, sobald Bärenwald dich einbindet."
        : section === "angebote"
          ? "Keine angenommenen Anfragen — nach Annahme erscheinen sie hier zur Angebotseinreichung."
          : section === "auftraege"
            ? "Keine Aufträge — sie erscheinen, sobald ein Projekt für dich angelegt ist."
            : ""
      : listFilter === "offen"
        ? `Keine offenen ${listItemLabel}.`
        : `Keine geschlossenen ${listItemLabel}.`;

  const sectionListEmpty = sectionCardRows.length === 0;

  function renderOverviewCard(row: PartnerCardRow, tab: OverviewTabId) {
    return (
      <PartnerListCard
        key={row.id}
        accent={row.accent}
        showLeftAccent={false}
        title={row.title}
        statusLabel={row.statusLabel}
        statusPillClass={
          tab === "angebote" || tab === "anfragen"
            ? partnerAngebotStatusPillClass(row.statusPillKey)
            : statusPillClass(row.statusPillKey)
        }
        meta={row.meta}
        hint={row.hint}
        footer={
          row.auftragPhasen ? (
            <PortalAuftragPhasenStrip
              states={row.auftragPhasen.states}
              aktuellePhase={row.auftragPhasen.aktuellePhase}
              fortschritt={row.auftragPhasen.fortschritt}
            />
          ) : undefined
        }
        onClick={() => openFromOverview(tab, row.id)}
      />
    );
  }

  function renderSectionCard(row: PartnerCardRow) {
    return (
      <PartnerListCard
        key={row.id}
        accent={row.accent}
        showLeftAccent={false}
        title={row.title}
        subtitle={row.subtitle}
        statusLabel={row.statusLabel}
        statusPillClass={
          section === "angebote" || section === "anfragen"
            ? partnerAngebotStatusPillClass(row.statusPillKey)
            : statusPillClass(row.statusPillKey)
        }
        meta={row.meta}
        hint={row.hint}
        footer={
          row.auftragPhasen ? (
            <PortalAuftragPhasenStrip
              states={row.auftragPhasen.states}
              aktuellePhase={row.auftragPhasen.aktuellePhase}
              fortschritt={row.auftragPhasen.fortschritt}
            />
          ) : undefined
        }
        selected={selectedId === row.id}
        onClick={() => selectRow(row.id)}
      />
    );
  }

  const detailPanel = (() => {
    if (section === "anfragen" && selectedAnfrageAuftrag && !selectedAnfrageAngebot) {
      return (
        <PartnerAuftragAnfrageDetail
          item={selectedAnfrageAuftrag}
          onAccepted={refreshAnfrageAfterRespond}
        />
      );
    }
    if (section === "anfragen" && selectedAnfrageAngebot) {
      return (
        <PartnerAnfrageDetail
          item={selectedAnfrageAngebot}
          onAccepted={refreshAnfrageAfterRespond}
        />
      );
    }
    if (section === "angebote" && selectedAngebot) {
      return <PartnerAngebotDetail item={selectedAngebot} />;
    }
    if (section === "angebote" && selectedId) {
      return (
        <p className="portal-text-body text-text-secondary">
          Angebot wird geladen …
        </p>
      );
    }
    if (section === "auftraege" && selectedAuftrag) {
      return <PartnerAuftragDetail item={selectedAuftrag} />;
    }
    return <p className="portal-text-body text-text-secondary">Nichts ausgewählt.</p>;
  })();

  return (
    <div className="portal-ui min-h-screen bg-surface-page">
      <header className="sticky top-0 z-50 border-b border-border-default bg-surface-card/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[68px] max-w-[1200px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Image src="/logo-mark-green.png" alt="Bärenwald" width={28} height={28} />
            <div>
              <p className="portal-text-body font-semibold leading-none text-text-primary">
                Bärenwald <span className="text-accent">Partner</span>
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <form action="/partner/auth/signout" method="post">
              <button
                type="submit"
                className="btn-pill-outline portal-btn-compact !px-2.5 sm:!px-3"
              >
                Abmelden
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1200px] grid-cols-1 gap-4 px-4 pb-36 pt-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-6 lg:pb-10">
        <aside className="hidden lg:block">
          <div className="sticky top-[92px] space-y-3">
            <nav className="card-bordered space-y-1 p-2">
              {MENU_ITEMS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => switchSection(id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left portal-text-body font-semibold",
                    section === id
                      ? id === "gpt"
                        ? "bg-[#EAF3DE] text-[#2E7D52]"
                        : "bg-accent-light text-accent"
                      : id === "gpt"
                        ? "text-[#2E7D52] hover:bg-[#EAF3DE]/60"
                        : "text-text-secondary hover:bg-muted"
                  )}
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {label}
                  </span>
                  <span className="portal-text-meta text-text-tertiary">
                    {id === "planer"
                      ? termine.length + aufgaben.length
                      : id === "anfragen"
                        ? offeneAnfragenCount
                        : id === "angebote"
                          ? offeneAngeboteCount
                          : id === "auftraege"
                            ? aktiveAuftraegeCount
                            : ""}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <section className="space-y-4">
          {section === "gpt" ? (
            <article className="card-bordered hidden overflow-hidden p-0 lg:block">
              <PortalBaerenwaldGpt
                variant="embedded"
                open
                onClose={() => setSection("uebersicht")}
              />
            </article>
          ) : null}

          {section === "profil" ? (
            <article className="card-bordered p-4 sm:p-5">
              <PartnerProfilPanel
                handwerker={handwerker}
                profil={profil}
              />
            </article>
          ) : null}

          {section === "planer" ? (
            <article className="card-bordered p-4 sm:p-5">
              <PartnerPlanerPanel
                termine={termine}
                aufgaben={aufgaben}
                onNavigate={navigateFromPlaner}
              />
            </article>
          ) : null}

          {section === "uebersicht" ? (
            <div className="space-y-4">
              <div className="space-y-0.5">
                <p className="portal-text-section text-text-primary">
                  Hallo {vorname}
                </p>
                <p className="portal-text-body text-text-secondary">
                  Willkommen im Partner-Portal
                </p>
              </div>

              <div className="grid min-w-0 grid-cols-3 gap-2">
                <article className="portal-kpi-card">
                  <p className="portal-kpi-label">Offene Anfragen</p>
                  <p className="portal-kpi-value">{offeneAnfragenCount}</p>
                </article>
                <article className="portal-kpi-card">
                  <p className="portal-kpi-label">Angebote offen</p>
                  <p className="portal-kpi-value">{offeneAngeboteCount}</p>
                </article>
                <article className="portal-kpi-card">
                  <p className="portal-kpi-label">Aktive Aufträge</p>
                  <p className="portal-kpi-value">{aktiveAuftraegeCount}</p>
                </article>
              </div>

              <button
                type="button"
                onClick={() => setGptOpen(true)}
                className="card-bordered flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:border-accent/30 lg:hidden"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF3DE] text-[#2E7D52]">
                    <MessagesSquare className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <p className="portal-text-body font-semibold text-text-primary">
                      Bärenwald GPT
                    </p>
                    <p className="portal-text-meta text-text-secondary">
                      Fragen zu Projekten, Gewerken & Abläufen
                    </p>
                  </div>
                </div>
                <span className="portal-text-body font-semibold text-accent">Öffnen →</span>
              </button>

              {(termine.length > 0 || aufgaben.length > 0) && (
                <button
                  type="button"
                  onClick={() => switchSection("planer")}
                  className="card-bordered flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:border-accent/30 lg:hidden"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-light text-accent">
                      <CalendarDays className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <p className="portal-text-body font-semibold text-text-primary">Planer</p>
                      <p className="portal-text-meta text-text-secondary">
                        {termine.length} Termine
                        {aufgaben.length > 0
                          ? ` · ${aufgaben.length} Aufgaben`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <span className="portal-text-body font-semibold text-accent">Öffnen →</span>
                </button>
              )}

              {handwerker.bewertung.bewertung_anzahl >= 1 &&
              handwerker.bewertung.bewertung_gesamt != null ? (
                <article className="card-bordered p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="portal-text-label text-text-tertiary">
                        Dein Durchschnitt
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 font-display text-2xl font-semibold text-text-primary">
                        <span>
                          {formatHandwerkerBewertung(handwerker.bewertung.bewertung_gesamt)} ★
                        </span>
                        <span className="portal-text-body font-normal text-text-secondary">
                          · {handwerker.bewertung.bewertung_anzahl}{" "}
                          {handwerker.bewertung.bewertung_anzahl === 1
                            ? "Bewertung"
                            : "Bewertungen"}
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBewertungExpanded((v) => !v)}
                      className="portal-text-body font-semibold text-accent"
                    >
                      {bewertungExpanded ? "Weniger" : "Kategorien"}
                    </button>
                  </div>
                  {bewertungExpanded ? (
                    <ul className="mt-4 space-y-2 border-t border-border-light pt-4">
                      {HANDWERKER_BEWERTUNG_KATEGORIEN.map((kat) => {
                        const profilKey = `bewertung_${kat.key}` as keyof typeof handwerker.bewertung;
                        const val = handwerker.bewertung[profilKey];
                        if (typeof val !== "number" || val == null) return null;
                        return (
                          <li
                            key={kat.key}
                            className="flex items-center justify-between gap-2"
                          >
                            <span className="portal-text-body text-text-secondary">
                              {kat.label}
                            </span>
                            <span className="portal-text-body font-semibold text-text-primary">
                              {formatHandwerkerBewertung(val)} ★
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </article>
              ) : null}

              <article className="card-bordered p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex gap-2">
                    {(
                      [
                        ["anfragen", "Anfragen"],
                        ["angebote", "Angebote"],
                        ["auftraege", "Aufträge"],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          setOverviewTab(id);
                          setOverviewPage(1);
                        }}
                        className={cn(
                          "rounded-full px-3 py-1.5 portal-text-meta font-semibold",
                          overviewTab === id
                            ? "bg-accent-light text-accent"
                            : "bg-muted text-text-secondary"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="portal-text-body font-semibold text-accent"
                    onClick={() => switchSection(overviewTab)}
                  >
                    Alle anzeigen →
                  </button>
                </div>

                <div className="space-y-2">
                  {overviewCardRows.length === 0 ? (
                    <p className="portal-text-body rounded-xl border border-dashed border-border-light bg-muted/20 px-3 py-6 text-center text-text-secondary">
                      {emptyLabelForTab(overviewTab)}
                    </p>
                  ) : (
                    paginatedOverviewCardRows.map((row) =>
                      renderOverviewCard(row, overviewTab)
                    )
                  )}
                </div>
                {overviewCardRows.length > PORTAL_OVERVIEW_PAGE_SIZE ? (
                  <PartnerListPagination
                    totalItems={overviewCardRows.length}
                    itemLabel={
                      overviewTab === "anfragen"
                        ? "Anfragen"
                        : overviewTab === "angebote"
                          ? "Angebote"
                          : "Aufträge"
                    }
                    currentPage={overviewSafePage}
                    totalPages={overviewTotalPages}
                    onPageChange={setOverviewPage}
                  />
                ) : null}
              </article>

              <section className="border-t border-border-default pt-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="portal-text-label text-text-tertiary">
                      Kontakt
                    </p>
                    <p className="portal-text-body text-text-secondary">
                      Fragen zu Anfragen, Aufträgen oder dem Portal? Bärenwald ist für dich
                      erreichbar.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={SITE_CONFIG.phoneHref}
                      className="btn-pill-primary portal-btn !justify-center !px-4 !py-3"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      Jetzt anrufen
                    </a>
                    <a
                      href={waHref}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-pill-outline portal-btn !justify-center !px-4 !py-3"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      WhatsApp
                    </a>
                    <a
                      href={`mailto:${SITE_CONFIG.email}?subject=${encodeURIComponent(
                        "Frage Partner-Portal"
                      )}`}
                      className="btn-pill-outline portal-btn !justify-center !px-4 !py-3"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      E-Mail
                    </a>
                  </div>
                </div>
              </section>
            </div>
          ) : null}

          {section !== "uebersicht" &&
          section !== "gpt" &&
          section !== "profil" &&
          section !== "planer" ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <article className="card-bordered overflow-hidden p-0">
                <PartnerListFilterBar
                  filter={listFilter}
                  onFilterChange={setListFilter}
                  counts={listFilterCounts}
                />
                <div className="space-y-2 p-3 sm:p-4">
                  {sectionListEmpty ? (
                    <p className="portal-text-body rounded-xl border border-dashed border-border-light bg-muted/20 px-3 py-8 text-center text-text-secondary">
                      {emptyMessage}
                    </p>
                  ) : (
                    paginatedCardRows.map(renderSectionCard)
                  )}
                </div>
                {!sectionListEmpty ? (
                  <PartnerListPagination
                    totalItems={sectionCardRows.length}
                    itemLabel={listItemLabel}
                    currentPage={safeListPage}
                    totalPages={listTotalPages}
                    onPageChange={setListPage}
                  />
                ) : null}
              </article>

              <aside className="hidden lg:block">
                <article className="card-bordered sticky top-[92px] max-h-[calc(100vh-110px)] overflow-y-auto p-4">
                  {detailPanel}
                </article>
              </aside>
            </div>
          ) : null}
        </section>
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-[90] border-t border-border-default bg-surface-card/95 backdrop-blur-sm lg:hidden"
        aria-label="Partner Navigation"
      >
        <div className="grid grid-cols-6 px-0.5 pb-2 pt-1">
          {MOBILE_NAV_ITEMS.map((id) => {
            const { label, icon: Icon } = MENU_ITEMS.find((m) => m.id === id)!;
            const badgeCount = portalNavBadgeCount(id, {
              anfragen: offeneAnfragenCount,
              angebote: offeneAngeboteCount,
              auftraege: aktiveAuftraegeCount,
            });
            return (
              <button
                key={id}
                type="button"
                onClick={() => switchSection(id)}
                className={cn(
                  "portal-text-nav rounded-lg px-0.5 py-2.5",
                  section === id ? "text-accent" : "text-text-tertiary"
                )}
                aria-label={
                  badgeCount > 0 ? `${label}, ${badgeCount} offen` : label
                }
              >
                <span className="flex flex-col items-center gap-0.5">
                  <span className="relative inline-flex">
                    <Icon className="h-[18px] w-[18px] stroke-[1.75]" />
                    <PortalNavCountBadge count={badgeCount} />
                  </span>
                  <span className="max-w-[52px] truncate text-[10px] leading-tight sm:text-[11px]">
                    {label}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <PortalMobileBottomSheet
        open={
          mobileDetailOpen &&
          section !== "uebersicht" &&
          section !== "gpt" &&
          section !== "profil" &&
          section !== "planer" &&
          !sectionListEmpty
        }
        onClose={() => setMobileDetailOpen(false)}
        ariaLabel="Details"
      >
        {detailPanel}
      </PortalMobileBottomSheet>

      <PortalBaerenwaldGpt
        variant="overlay"
        open={gptOpen}
        onClose={() => {
          setGptOpen(false);
        }}
      />

      <OnboardingTour
        open={onboardingOpen}
        audience="partner"
        slides={PARTNER_ONBOARDING_SLIDES}
        onClose={() => setOnboardingOpen(false)}
      />

      <PortalLegalFooter
        variant="partner"
        className="mx-auto max-w-[1200px] px-4 pb-28 pt-3 lg:px-6 lg:pb-6"
      />
    </div>
  );
}
