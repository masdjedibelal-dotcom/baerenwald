"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import "@/components/onboarding/onboarding.css";
import { PartnerHwDashboard, partnerDashboardStatusColors } from "@/components/partner/PartnerHwDashboard";
import { PORTAL_HEADER_HERO_SRC } from "@/lib/portal2/portal-media";
import { PartnerNotificationBell } from "@/components/partner/PartnerNotificationBell";
import { PartnerPlanerPanel } from "@/components/partner/PartnerPlanerPanel";
import { PartnerProfilPanel } from "@/components/partner/PartnerProfilPanel";
import { VorgangCard } from "@/components/partner/VorgangCard";
import { PartnerListCard } from "@/components/partner/PartnerListCard";
import {
  PARTNER_LIST_PAGE_SIZE,
  PartnerListPagination,
} from "@/components/partner/PartnerListPagination";
import { PortalBaerenwaldGpt } from "@/components/portal/PortalBaerenwaldGpt";
import { PortalLegalFooter } from "@/components/shared/PortalLegalFooter";
import { PortalShell } from "@/components/shared/PortalShell";
import { PortalHeaderSearch } from "@/components/shared/PortalHeaderSearch";
import { PortalEmptyState } from "@/components/shared/PortalStateView";
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
  partnerStatusChipStyle,
  type PartnerCardRow,
} from "@/lib/partner/partner-list-mappers";
import {
  PortalListeEyebrow,
  PortalListeFilterChip,
  PortalListeTitle,
} from "@/components/shared/PortalListeChrome";
import type { VorgangFilter } from "@/lib/partner/vorgang-state";
import { VORGANG_FILTER_ORDER } from "@/lib/partner/vorgang-state";
import { buildPortalShellNav } from "@/lib/portal2/nav-items";
import { partnerSectionListPath, partnerVorgangPortalPath } from "@/lib/partner/partner-site-url";

type PartnerSection =
  | "uebersicht"
  | "profil"
  | "planer"
  | "vorgaenge"
  | "gpt";
type OverviewTabId = "vorgaenge";

const VORGANG_FILTER_LABELS: Record<VorgangFilter, string> = {
  alle: "Alle",
  offen: "Offen",
  auftrag: "Auftrag",
  erledigt: "Erledigt",
};

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
    <div className="flex flex-wrap gap-2 py-3.5">
      {VORGANG_FILTER_ORDER.map((id) => (
        <PortalListeFilterChip
          key={id}
          active={filter === id}
          onClick={() => onFilterChange(id)}
          count={counts[id]}
        >
          {VORGANG_FILTER_LABELS[id]}
        </PortalListeFilterChip>
      ))}
    </div>
  );
}

/** Listen-Unterzeile wie Kundenportal: Adresse, kein Icon-Stack. */
function partnerListSubtitle(row: PartnerCardRow): string | undefined {
  if (row.subtitle?.trim()) return row.subtitle.trim();
  // buildAuftragCardMeta: zuerst Ort, dann Zeitraum
  const ort = row.meta[0]?.text?.trim();
  return ort && ort !== "—" ? ort : undefined;
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
  const _overviewTab: OverviewTabId = "vorgaenge";
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [_mobileDetailOpen, setMobileDetailOpen] = useState(false);
  /** Tab-Navigation: alte URL-Parameter ignorieren bis Listen-URL ohne id da ist. */
  const ignoreUrlDetailRef = useRef(false);
  const [gptOpen, setGptOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  useEffect(() => {
    if (!isOnboardingCompleted("partner")) {
      setOnboardingOpen(true);
    }
  }, []);
  const [listPage, setListPage] = useState(1);

  const [vorgangListFilter, setVorgangListFilter] =
    useState<VorgangFilter>("alle");

  /** Nur echte To-dos (neu, geändert, Bautagebuch, Unterlagen) — nicht „Durchführung“. */
  const vorgaengeTodoCount = aufgaben.length;

  const vorgangFilterEffective: VorgangFilter =
    section === "vorgaenge" ? vorgangListFilter : "alle";

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
    // Dashboard „Zuletzt“: aktive Vorgänge (Offen + Auftrag), ohne Erledigt
    return buildVorgangCardRows(
      vorgaenge.filter((v) => v.state !== "erledigt"),
      "alle"
    );
  }, [vorgaenge]);

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
      if (
        filterRaw === "erledigt" ||
        filterRaw === "offen" ||
        filterRaw === "auftrag" ||
        filterRaw === "alle"
      ) {
        setVorgangListFilter(filterRaw);
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
    setVorgangListFilter("alle");
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
    setVorgangListFilter("auftrag");
    setSelectedId(null);
    setMobileDetailOpen(false);
    router.replace(`/partner?section=vorgaenge&filter=auftrag`);
    router.refresh();
  }

  function switchSection(id: PartnerSection, filter: VorgangFilter = "alle") {
    setListPage(1);
    setVorgangListFilter(filter);
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
      router.replace(
        filter === "alle"
          ? partnerSectionListPath("vorgaenge")
          : `/partner?section=vorgaenge&filter=${filter}`
      );
    }
  }

  function openFromOverview(_tab: OverviewTabId, id: string) {
    setVorgangListFilter("alle");
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

  function closeDetail() {
    setSelectedId(null);
    setMobileDetailOpen(false);
    router.replace(partnerSectionListPath("vorgaenge"));
  }

  const sectionListEmpty = sectionCardRows.length === 0;
  /** Mock-Leerzustand nur wenn wirklich keine Vorgänge; Filter-Leer = Kurztext. */
  const showPortalEmptyVorgaenge =
    section === "vorgaenge" && sectionListEmpty && vorgaenge.length === 0;
  const filterEmptyMessage =
    vorgangFilterEffective === "offen"
      ? "Keine offenen Vorgänge."
      : vorgangFilterEffective === "auftrag"
        ? "Keine Aufträge in Ausführung."
        : vorgangFilterEffective === "erledigt"
          ? "Keine erledigten Vorgänge."
          : "Keine Vorgänge.";

  function renderSectionCard(row: PartnerCardRow) {
    return (
      <PartnerListCard
        key={row.id}
        variant="card"
        accent={row.accent}
        showLeftAccent={false}
        showChevron
        title={row.title}
        subtitle={partnerListSubtitle(row)}
        statusLabel={row.statusLabel}
        statusPillClass={partnerAngebotStatusPillClass(row.statusPillKey)}
        statusPillStyle={partnerStatusChipStyle(row.statusPillKey)}
        meta={[]}
        selected={false}
        onClick={() => selectRow(row.id)}
      />
    );
  }

  const detailScreen =
    section === "vorgaenge" && selectedVorgang ? (
      <div className="-mx-4 -mt-4 min-w-0 space-y-3 lg:-mx-6 lg:-mt-5">
        <div className="px-4 pt-3 lg:px-6">
          <button
            type="button"
            onClick={closeDetail}
            className="rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-white"
            style={{ background: "rgba(0,0,0,.42)" }}
          >
            ‹ Zurück
          </button>
        </div>
        <div className="px-4 pb-4 lg:px-6">
          <VorgangCard
            vorgang={selectedVorgang}
            onUpdated={refreshVorgangAfterConfirm}
          />
        </div>
      </div>
    ) : section === "vorgaenge" && selectedId ? (
      <p className="portal-text-body text-text-secondary">Vorgang wird geladen …</p>
    ) : null;

  const listScreen = (
    <div className="flex min-w-0 flex-col">
      <div className="px-0.5 pb-1">
        <PortalListeEyebrow>Handwerker</PortalListeEyebrow>
        <PortalListeTitle>Anfragen &amp; Aufträge</PortalListeTitle>
      </div>
      <PartnerVorgangListFilterBar
        filter={vorgangListFilter}
        onFilterChange={setVorgangListFilter}
        counts={vorgangListFilterCounts}
      />
      <div className="flex flex-col gap-2.5">
        {sectionListEmpty ? (
          showPortalEmptyVorgaenge ? (
            <div className="rounded-[12px] border border-border-default bg-white p-4">
              <PortalEmptyState role="handwerker" compact />
            </div>
          ) : (
            <p className="portal-text-body rounded-[12px] border border-border-default bg-white px-4 py-8 text-center text-text-secondary">
              {filterEmptyMessage}
            </p>
          )
        ) : (
          paginatedCardRows.map(renderSectionCard)
        )}
        {!sectionListEmpty && sectionCardRows.length > PARTNER_LIST_PAGE_SIZE ? (
          <PartnerListPagination
            totalItems={sectionCardRows.length}
            itemLabel={listItemLabel}
            currentPage={safeListPage}
            totalPages={listTotalPages}
            onPageChange={setListPage}
          />
        ) : null}
      </div>
    </div>
  );

  const shellNav = buildPortalShellNav("handwerker", "partner", {
    liste: vorgaengeTodoCount,
  });

  const partnerFooter =
    handwerker.firma?.trim() || handwerker.name?.trim() || "Partner-Betrieb";

  return (
    <>
      <PortalShell
        variant="partner"
        brandTitle="Bärenwald Partner"
        brandSubtitle="Partner-Portal"
        brandKuerzel="B"
        sidebarOwner={partnerFooter}
        activeNavId={
          section === "gpt" || section === "planer" ? "uebersicht" : section
        }
        onNavChange={(id) => switchSection(id as PartnerSection)}
        nav={shellNav}
        footer={partnerFooter}
        headerUser={{ name: partnerFooter }}
        headerSearch={
          <PortalHeaderSearch
            onSubmit={() => {
              switchSection("vorgaenge");
            }}
          />
        }
        notifications={
          <>
            <PartnerNotificationBell onOpenVorgang={openVorgangFromNotification} />
            <form action="/partner/auth/signout" method="post">
              <button
                type="submit"
                className="btn-pill-outline portal-btn-compact !px-2.5 sm:!px-3"
              >
                Abmelden
              </button>
            </form>
          </>
        }
      >
        <div className="space-y-5">
          {section === "gpt" ? (
            <article className="portal-surface hidden overflow-hidden p-0 lg:block">
              <PortalBaerenwaldGpt
                variant="embedded"
                open
                onClose={() => setSection("uebersicht")}
              />
            </article>
          ) : null}

          {section === "profil" ? (
            <article className="portal-surface p-4 sm:p-5">
              <PartnerProfilPanel
                handwerker={handwerker}
                profil={profil}
              />
            </article>
          ) : null}

          {section === "planer" ? (
            <article className="portal-surface p-4 sm:p-5">
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
            <PartnerHwDashboard
              firmName={partnerFooter}
              heroImageUrl={PORTAL_HEADER_HERO_SRC}
              kpis={{
                neueAnfragen: vorgaenge.filter(
                  (v) => v.state === "neu" || v.state === "geaendert"
                ).length,
                inAusfuehrung: vorgaenge.filter(
                  (v) => v.state === "in_bearbeitung"
                ).length,
                erledigt: vorgaenge.filter((v) => v.state === "erledigt").length,
              }}
              onOpenAll={() => switchSection("vorgaenge", "alle")}
              onKpiClick={(id) => {
                if (id === "erledigt") {
                  switchSection("vorgaenge", "erledigt");
                } else if (id === "inAusfuehrung") {
                  switchSection("vorgaenge", "auftrag");
                } else {
                  switchSection("vorgaenge", "offen");
                }
              }}
              onOpenItem={(id) => openFromOverview("vorgaenge", id)}
              recent={overviewCardRows.slice(0, 4).map((row) => {
                const colors = partnerDashboardStatusColors(row.statusPillKey);
                return {
                  id: row.id,
                  titel: row.title,
                  objekt:
                    row.subtitle?.trim() ||
                    row.meta.map((m) => m.text).find(Boolean) ||
                    "—",
                  statusLabel: row.statusLabel,
                  statusColor: colors.color,
                  statusBg: colors.bg,
                };
              })}
            />
          ) : null}

          {section === "vorgaenge"
            ? selectedId
              ? detailScreen
              : listScreen
            : null}
        </div>
      </PortalShell>

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
        className="mx-auto max-w-[1200px] px-4 pb-8 pt-3 lg:px-6"
      />
    </>
  );
}
