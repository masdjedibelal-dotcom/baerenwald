"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  Mail,
  MessageCircle,
  MessagesSquare,
  Phone,
  User,
} from "lucide-react";

import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import "@/components/onboarding/onboarding.css";
import { PartnerNotificationBell } from "@/components/partner/PartnerNotificationBell";
import { PartnerPlanerPanel } from "@/components/partner/PartnerPlanerPanel";
import { PartnerProfilPanel } from "@/components/partner/PartnerProfilPanel";
import { VorgangCard } from "@/components/partner/VorgangCard";
import { PartnerListCard } from "@/components/partner/PartnerListCard";
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
import type { PartnerPlanerSection } from "@/lib/partner/build-partner-termine";
import type {
  PartnerAnfrageItem,
  PartnerAuftragItem,
  PartnerHandwerkerProfil,
  PartnerProfilKontext,
  PartnerTerminItem,
  PartnerAufgabeItem,
  PartnerTodoItem,
  PartnerVorgangItem,
} from "@/lib/partner/get-partner-data";
import { countPartnerVorgaengeFilter } from "@/lib/partner/build-partner-vorgaenge";
import {
  buildVorgangCardRows,
  partnerAngebotStatusPillClass,
  type PartnerCardRow,
} from "@/lib/partner/partner-list-mappers";
import {
  formatHandwerkerBewertung,
  HANDWERKER_BEWERTUNG_KATEGORIEN,
} from "@/lib/partner/handwerker-bewertung-display";
import type { VorgangFilter } from "@/lib/partner/vorgang-state";
import { cn } from "@/lib/utils";
import { partnerSectionListPath, partnerVorgangPortalPath } from "@/lib/partner/partner-site-url";

type PartnerSection =
  | "uebersicht"
  | "profil"
  | "planer"
  | "vorgaenge"
  | "gpt";
type OverviewTabId = "vorgaenge";

const VORGANG_FILTER_LABELS: Record<VorgangFilter, string> = {
  offen: "Offen",
  erledigt: "Erledigt",
};

const MENU_ITEMS: Array<{
  id: PartnerSection;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: "uebersicht", label: "Übersicht", icon: LayoutDashboard },
  { id: "vorgaenge", label: "Vorgänge", icon: ClipboardList },
  { id: "gpt", label: "GPT", icon: MessagesSquare },
  { id: "planer", label: "Planer", icon: CalendarDays },
  { id: "profil", label: "Profil", icon: User },
];

const MOBILE_NAV_ITEMS = [
  "uebersicht",
  "vorgaenge",
  "planer",
  "profil",
] as const satisfies readonly PartnerSection[];

function normalizeSectionFromUrl(raw: string | undefined): PartnerSection | null {
  if (!raw) return null;
  if (
    raw === "anfragen" ||
    raw === "angebote" ||
    raw === "offen" ||
    raw === "auftraege"
  ) {
    return "vorgaenge";
  }
  if (
    raw === "uebersicht" ||
    raw === "profil" ||
    raw === "planer" ||
    raw === "vorgaenge" ||
    raw === "gpt"
  ) {
    return raw;
  }
  return null;
}

function isPartnerListSection(section: PartnerSection): boolean {
  return section === "vorgaenge";
}

function emptyOverviewLabel(): string {
  return "Keine offenen Vorgänge";
}

function PartnerVorgangListFilterBar({
  filter,
  onFilterChange,
  counts,
}: {
  filter: VorgangFilter;
  onFilterChange: (filter: VorgangFilter) => void;
  counts: Record<VorgangFilter, number>;
}) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-border-default px-3 py-3 sm:px-4">
      {(["offen", "erledigt"] as const).map((id) => (
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

export function PartnerClient({
  handwerker,
  profil,
  termine,
  aufgaben,
  auftragAnfragen,
  auftraege,
  vorgaenge,
}: {
  handwerker: PartnerHandwerkerProfil;
  profil: PartnerProfilKontext;
  termine: PartnerTerminItem[];
  aufgaben: PartnerAufgabeItem[];
  /** @deprecated Eigene Todos entfallen zugunsten systemischer Aufgaben */
  todos?: PartnerTodoItem[];
  /** @deprecated Legacy-Listen — Tab Vorgänge nutzt `vorgaenge`. */
  anfragen?: PartnerAnfrageItem[];
  /** @deprecated Legacy-Listen — Tab Vorgänge nutzt `vorgaenge`. */
  angebote?: PartnerAnfrageItem[];
  /** Alle akzeptierten HW-Angebote inkl. übernommen (Deep-Link). */
  angeboteAlleAkzeptiert?: PartnerAnfrageItem[];
  /** @deprecated — ersetzt durch `vorgaenge`. */
  offen?: unknown[];
  /** Planer-Termine (Legacy-Split). */
  auftragAnfragen: PartnerAuftragItem[];
  /** Planer-Termine (Legacy-Split). */
  auftraege: PartnerAuftragItem[];
  /** Vereinheitlichte Vorgänge-Liste (ein Tab). */
  vorgaenge: PartnerVorgangItem[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [section, setSection] = useState<PartnerSection>("uebersicht");
  const overviewTab: OverviewTabId = "vorgaenge";
  const [overviewPage, setOverviewPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  /** Tab-Navigation: alte URL-Parameter ignorieren bis Listen-URL ohne id da ist. */
  const ignoreUrlDetailRef = useRef(false);
  const [gptOpen, setGptOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  useEffect(() => {
    if (!isOnboardingCompleted("partner")) {
      setOnboardingOpen(true);
    }
  }, []);
  const [bewertungExpanded, setBewertungExpanded] = useState(false);
  const [listPage, setListPage] = useState(1);
  const [vorgangListFilter, setVorgangListFilter] =
    useState<VorgangFilter>("offen");

  const vorname = handwerker.vorname || "Partner";

  const vorgaengeOffenCount = countPartnerVorgaengeFilter(vorgaenge).offen;

  const vorgangFilterEffective: VorgangFilter =
    section === "vorgaenge" ? vorgangListFilter : "offen";

  const sectionCardRows = useMemo((): PartnerCardRow[] => {
    if (section === "vorgaenge") {
      return buildVorgangCardRows(vorgaenge, vorgangFilterEffective);
    }
    return [];
  }, [section, vorgangFilterEffective, vorgaenge]);

  const vorgangListFilterCounts = useMemo(
    () => countPartnerVorgaengeFilter(vorgaenge),
    [vorgaenge]
  );

  const listTotalPages = Math.max(
    1,
    Math.ceil(sectionCardRows.length / PARTNER_LIST_PAGE_SIZE)
  );
  const safeListPage = Math.min(listPage, listTotalPages);
  const paginatedCardRows = sectionCardRows.slice(
    (safeListPage - 1) * PARTNER_LIST_PAGE_SIZE,
    safeListPage * PARTNER_LIST_PAGE_SIZE
  );

  const listItemLabel = section === "vorgaenge" ? "Vorgänge" : "";

  useEffect(() => {
    setListPage(1);
  }, [section, vorgangListFilter]);

  useEffect(() => {
    if (!isPartnerListSection(section)) {
      return;
    }
    if (!selectedId) return;
    if (sectionCardRows.some((r) => r.id === selectedId)) return;
    if (selectedId.startsWith("auftrag:")) {
      const aid = selectedId.slice("auftrag:".length);
      if (sectionCardRows.some((r) => r.id === `auftrag:${aid}` || r.id === aid)) {
        return;
      }
    }
    setSelectedId(null);
    setMobileDetailOpen(false);
  }, [section, sectionCardRows, selectedId]);

  const overviewCardRows = useMemo((): PartnerCardRow[] => {
    return buildVorgangCardRows(vorgaenge, "offen");
  }, [vorgaenge]);

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

  useEffect(() => {
    if (ignoreUrlDetailRef.current) {
      const rawSection = searchParams.get("section")?.trim();
      const normalized = normalizeSectionFromUrl(rawSection);
      const rawId =
        searchParams.get("id")?.trim() || searchParams.get("auftrag")?.trim();
      if (normalized && isPartnerListSection(normalized) && !rawId) {
        ignoreUrlDetailRef.current = false;
        setSection(normalized);
        setSelectedId(null);
        setMobileDetailOpen(false);
      }
      return;
    }

    const rawSection = searchParams.get("section")?.trim();
    if (!rawSection) return;

    if (rawSection === "profil" || rawSection === "unterlagen") {
      setSection("profil");
      setMobileDetailOpen(false);
      return;
    }

    if (rawSection === "planer") {
      setSection("planer");
      setMobileDetailOpen(false);
      return;
    }

    const normalized = normalizeSectionFromUrl(rawSection);
    if (!normalized) return;

    if (normalized === "vorgaenge") {
      const filterRaw = searchParams.get("filter")?.trim();
      if (filterRaw === "erledigt") {
        setVorgangListFilter("erledigt");
      } else if (filterRaw === "offen") {
        setVorgangListFilter("offen");
      }

      const rawId = searchParams.get("id")?.trim() || searchParams.get("auftrag")?.trim();
      setSection("vorgaenge");

      if (rawSection === "anfragen" || rawSection === "angebote" || rawSection === "offen") {
        if (rawId) {
          router.replace(partnerVorgangPortalPath(rawId.replace(/^auftrag:/, "")));
        } else {
          router.replace(partnerSectionListPath("vorgaenge"));
        }
      }

      if (!rawId) {
        setSelectedId(null);
        setMobileDetailOpen(false);
        return;
      }

      const vorgangId = rawId.startsWith("auftrag:")
        ? rawId.slice("auftrag:".length)
        : rawId;

      const match =
        vorgaenge.find((v) => v.id === vorgangId) ??
        vorgaenge.find((v) => v.anfrage?.id === vorgangId);

      if (match) {
        setSelectedId(match.id);
        setMobileDetailOpen(true);
        return;
      }

      setSelectedId(vorgangId);
      setMobileDetailOpen(true);
    }
  }, [searchParams, vorgaenge, router]);

  const selectedVorgang = useMemo(() => {
    if (!selectedId) return undefined;
    return (
      vorgaenge.find((v) => v.id === selectedId) ??
      vorgaenge.find((v) => v.anfrage?.id === selectedId)
    );
  }, [vorgaenge, selectedId]);

  function navigateFromPlaner(
    target: PartnerPlanerSection,
    selectedId?: string
  ) {
    setSection(target);
    setListPage(1);
    setVorgangListFilter("offen");
    if (selectedId) {
      const id = selectedId.replace(/^auftrag:/, "");
      setSelectedId(id);
      if (target !== "profil") setMobileDetailOpen(true);
    }
  }

  function openVorgangFromNotification(vorgangId: string, href: string) {
    ignoreUrlDetailRef.current = false;
    setSection("vorgaenge");
    setListPage(1);

    const match =
      vorgaenge.find((v) => v.id === vorgangId) ??
      vorgaenge.find((v) => v.anfrage?.id === vorgangId);

    setSelectedId(match?.id ?? vorgangId);
    setMobileDetailOpen(true);
    router.push(href);
  }

  function refreshVorgangAfterConfirm(id: string) {
    const vorgangId = id.trim();
    if (!vorgangId) return;
    setSection("vorgaenge");
    setListPage(1);
    setVorgangListFilter("offen");
    setSelectedId(null);
    setMobileDetailOpen(false);
    router.replace(partnerSectionListPath("vorgaenge"));
    router.refresh();
  }

  function switchSection(id: PartnerSection) {
    setListPage(1);
    setVorgangListFilter("offen");
    setMobileDetailOpen(false);
    if (id !== "gpt") setGptOpen(false);
    if (id === "uebersicht" || id === "gpt" || id === "profil" || id === "planer") {
      setSection(id);
      if (id === "uebersicht") router.replace("/partner");
      return;
    }
    setSection(id);
    if (id === "vorgaenge") {
      ignoreUrlDetailRef.current = true;
      setSelectedId(null);
      router.replace(partnerSectionListPath("vorgaenge"));
    }
  }

  function openFromOverview(_tab: OverviewTabId, id: string) {
    setSelectedId(id);
    setSection("vorgaenge");
    setMobileDetailOpen(true);
    router.replace(partnerVorgangPortalPath(id));
  }

  function selectRow(id: string) {
    setSelectedId(id);
    setMobileDetailOpen(true);
    if (section === "vorgaenge") {
      router.replace(partnerVorgangPortalPath(id));
    }
  }

  const waNumber = SITE_CONFIG.phoneMobil.replace(/\D/g, "");
  const waHref = `https://wa.me/${waNumber}?text=${encodeURIComponent(
    "Hallo Bärenwald, ich habe eine Frage zum Partner-Portal."
  )}`;

  const emptyMessage = (() => {
    if (section !== "vorgaenge") return "";
    if (vorgaenge.length === 0) {
      return "Keine Vorgänge — du wirst per E-Mail benachrichtigt, sobald Bärenwald dich einbindet.";
    }
    return vorgangFilterEffective === "offen"
      ? "Keine offenen Vorgänge."
      : "Keine erledigten Vorgänge.";
  })();

  const sectionListEmpty = sectionCardRows.length === 0;

  function renderOverviewCard(row: PartnerCardRow, tab: OverviewTabId) {
    return (
      <PartnerListCard
        key={row.id}
        accent={row.accent}
        showLeftAccent={false}
        title={row.title}
        statusLabel={row.statusLabel}
        statusPillClass={partnerAngebotStatusPillClass(row.statusPillKey)}
        meta={row.meta}
        hint={row.hint}
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
        statusPillClass={partnerAngebotStatusPillClass(row.statusPillKey)}
        meta={row.meta}
        hint={row.hint}
        selected={selectedId === row.id}
        onClick={() => selectRow(row.id)}
      />
    );
  }

  const detailPanel = (() => {
    if (section === "vorgaenge" && selectedVorgang) {
      return (
        <VorgangCard
          vorgang={selectedVorgang}
          onUpdated={refreshVorgangAfterConfirm}
        />
      );
    }
    if (section === "vorgaenge" && selectedId) {
      return (
        <p className="portal-text-body text-text-secondary">
          Vorgang wird geladen …
        </p>
      );
    }
    return <p className="portal-text-body text-text-secondary">Zeile auswählen.</p>;
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
            <PartnerNotificationBell onOpenVorgang={openVorgangFromNotification} />
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
                      : id === "vorgaenge"
                        ? vorgaengeOffenCount
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
                auftragAnfragen={auftragAnfragen}
                auftraege={auftraege}
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

              <div className="grid min-w-0 grid-cols-2 gap-2">
                <article className="portal-kpi-card">
                  <p className="portal-kpi-label">Vorgänge offen</p>
                  <p className="portal-kpi-value">{vorgaengeOffenCount}</p>
                </article>
                <article className="portal-kpi-card">
                  <p className="portal-kpi-label">Gesamt</p>
                  <p className="portal-kpi-value">{vorgaenge.length}</p>
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
                          ? ` · ${aufgaben.length} To-dos`
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
                  <p className="portal-text-body font-semibold text-text-primary">
                    Offene Vorgänge
                  </p>
                  <button
                    type="button"
                    className="portal-text-body font-semibold text-accent"
                    onClick={() => switchSection("vorgaenge")}
                  >
                    Alle anzeigen →
                  </button>
                </div>

                <div className="space-y-2">
                  {overviewCardRows.length === 0 ? (
                    <p className="portal-text-body rounded-xl border border-dashed border-border-light bg-muted/20 px-3 py-6 text-center text-text-secondary">
                      {emptyOverviewLabel()}
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
                    itemLabel="Vorgänge"
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
                {section === "vorgaenge" ? (
                  <PartnerVorgangListFilterBar
                    filter={vorgangListFilter}
                    onFilterChange={setVorgangListFilter}
                    counts={vorgangListFilterCounts}
                  />
                ) : null}
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
        <div className="grid w-full grid-cols-4 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
          {MOBILE_NAV_ITEMS.map((id) => {
            const { label, icon: Icon } = MENU_ITEMS.find((m) => m.id === id)!;
            const badgeCount = portalNavBadgeCount(id, {
              vorgaenge: vorgaengeOffenCount,
              anfragen: 0,
              angebote: 0,
              auftraege: 0,
            });
            return (
              <button
                key={id}
                type="button"
                onClick={() => switchSection(id)}
                className={cn(
                  "portal-text-nav flex w-full flex-col items-center justify-center rounded-lg px-1 py-2.5",
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
          !!selectedId &&
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
