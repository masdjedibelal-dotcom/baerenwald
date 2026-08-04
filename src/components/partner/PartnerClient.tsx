"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { PartnerHwDashboard, partnerDashboardStatusColors } from "@/components/partner/PartnerHwDashboard";
import { PORTAL_HEADER_HERO_SRC } from "@/lib/portal2/portal-media";
import { PartnerNotificationBell } from "@/components/partner/PartnerNotificationBell";
import { PartnerPlanerPanel } from "@/components/partner/PartnerPlanerPanel";
import { PartnerProfilPanel } from "@/components/partner/PartnerProfilPanel";
import { VorgangCard } from "@/components/partner/VorgangCard";
import { PartnerListCard } from "@/components/partner/PartnerListCard";
import { portalListStackClass } from "@/lib/portal2/layout-chrome";
import {
  PARTNER_LIST_PAGE_SIZE,
  PartnerListPagination,
} from "@/components/partner/PartnerListPagination";
import { PortalBaerenwaldGpt } from "@/components/portal/PortalBaerenwaldGpt";
import { PortalContentBusy } from "@/components/shared/PortalContentBusy";
import { PortalLegalFooter } from "@/components/shared/PortalLegalFooter";
import { PortalShell } from "@/components/shared/PortalShell";
import { PortalHeaderSearch } from "@/components/shared/PortalHeaderSearch";
import { PortalEmptyState } from "@/components/shared/PortalStateView";
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
import { PortalListeFilterBar } from "@/components/shared/PortalListeFilterBar";
import {
  PortalListeEyebrow,
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
  auftrag: "In Ausführung",
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
    <PortalListeFilterBar
      value={filter}
      onChange={onFilterChange}
      sheetTitle="Vorgänge"
      options={VORGANG_FILTER_ORDER.map((id) => ({
        id,
        label: VORGANG_FILTER_LABELS[id],
        count: counts[id],
      }))}
    />
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
  /** Tab-Navigation: alte URL-Parameter ignorieren bis Listen-URL ohne id da ist. */
  const ignoreUrlDetailRef = useRef(false);
  const [gptOpen, setGptOpen] = useState(false);
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
    // Nur löschen, wenn Vorgang überhaupt nicht existiert — nicht nur wegen Filter
    const existsAnywhere = vorgaenge.some(
      (v) =>
        v.id === selectedId ||
        v.anfrage?.id === selectedId ||
        `auftrag:${v.id}` === selectedId
    );
    if (!existsAnywhere) {
      setSelectedId(null);
      return;
    }
    // Filter würde Detail verstecken → Filter auf „alle“
    setVorgangListFilter("alle");
  }, [section, sectionCardRows, selectedId, vorgaenge]);

  const overviewCardRows = useMemo((): PartnerCardRow[] => {
    // Dashboard „Zuletzt“: aktive Vorgänge (Offen + Auftrag), ohne Erledigt
    return buildVorgangCardRows(
      vorgaenge.filter((v) => v.state !== "erledigt"),
      "alle"
    );
  }, [vorgaenge]);

  useEffect(() => {
    const rawSection = searchParams.get("section")?.trim();
    const normalized = normalizeSectionFromUrl(rawSection);
    const rawId =
      searchParams.get("id")?.trim() || searchParams.get("auftrag")?.trim();

    if (ignoreUrlDetailRef.current) {
      if (normalized && isPartnerListSection(normalized) && rawId) {
        ignoreUrlDetailRef.current = false;
      } else if (normalized && isPartnerListSection(normalized) && !rawId) {
        ignoreUrlDetailRef.current = false;
        setSection(normalized);
        setSelectedId(null);
        return;
      } else {
        return;
      }
    }

    if (!rawSection) return;

    if (rawSection === "profil" || rawSection === "unterlagen") {
      setSection("profil");
      return;
    }

    if (rawSection === "planer") {
      setSection("planer");
      return;
    }

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
      } else if (rawId) {
        // Notification ohne Filter → nicht an altem Filter hängen bleiben
        setVorgangListFilter("alle");
      }

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
        return;
      }

      setSelectedId(vorgangId);
    }
  }, [searchParams, vorgaenge, router]);

  /** Deep-Link-Parameter nach einmaligem Öffnen aus der URL entfernen. */
  useEffect(() => {
    const focus = searchParams.get("focus")?.trim();
    if (!focus || !selectedId) return;
    if (focus !== "bautagebuch" && focus !== "abnahme") return;
    const t = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("focus");
      params.delete("anfrage");
      params.delete("protokoll");
      const qs = params.toString();
      router.replace(qs ? `/partner?${qs}` : "/partner", { scroll: false });
    }, 800);
    return () => window.clearTimeout(t);
  }, [selectedId, searchParams, router]);

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
    }
  }

  function openVorgangFromNotification(vorgangId: string, href: string) {
    ignoreUrlDetailRef.current = false;
    setSection("vorgaenge");
    setListPage(1);
    setVorgangListFilter("alle");

    const match =
      vorgaenge.find((v) => v.id === vorgangId) ??
      vorgaenge.find((v) => v.anfrage?.id === vorgangId);

    setSelectedId(match?.id ?? vorgangId);
    router.push(href);
  }

  const [pageBusy, setPageBusy] = useState(false);

  function flashPageBusy(ms = 400) {
    setPageBusy(true);
    window.setTimeout(() => setPageBusy(false), ms);
  }

  function refreshVorgangAfterConfirm(id: string) {
    const vorgangId = id.trim();
    if (!vorgangId) return;
    setSection("vorgaenge");
    setListPage(1);
    setVorgangListFilter("auftrag");
    setSelectedId(null);
    router.replace(`/partner?section=vorgaenge&filter=auftrag`);
    flashPageBusy();
    router.refresh();
  }

  function switchSection(id: PartnerSection, filter: VorgangFilter = "alle") {
    setListPage(1);
    setVorgangListFilter(filter);
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
    router.replace(partnerVorgangPortalPath(id));
  }

  function selectRow(id: string) {
    setSelectedId(id);
    if (section === "vorgaenge") {
      router.replace(partnerVorgangPortalPath(id));
    }
  }

  function closeDetail() {
    setSelectedId(null);
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
        variant="responsive"
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
      <div className="-mx-4 -mt-4 min-w-0 pb-4 lg:-mx-6 lg:-mt-5">
        <VorgangCard
          vorgang={selectedVorgang}
          onBack={closeDetail}
          onUpdated={refreshVorgangAfterConfirm}
          focusBautagebuch={
            searchParams.get("focus")?.trim() === "bautagebuch"
          }
          anfrageId={searchParams.get("anfrage")?.trim() || null}
          focusAbnahme={searchParams.get("focus")?.trim() === "abnahme"}
          protokollId={searchParams.get("protokoll")?.trim() || null}
        />
      </div>
    ) : section === "vorgaenge" && selectedId ? (
      <PortalContentBusy
        title="Vorgang wird geladen…"
        body="Einen Moment — wir öffnen die Details."
      />
    ) : null;

  const listScreen = (
    <div className="flex min-w-0 flex-col">
      <div className="px-0.5 pb-1">
        <PortalListeEyebrow>Handwerker</PortalListeEyebrow>
        <PortalListeTitle>Vorgänge</PortalListeTitle>
      </div>
      <PartnerVorgangListFilterBar
        filter={vorgangListFilter}
        onFilterChange={setVorgangListFilter}
        counts={vorgangListFilterCounts}
      />
      <div className={portalListStackClass("responsive")}>
        {sectionListEmpty ? (
          showPortalEmptyVorgaenge ? (
            <PortalEmptyState role="handwerker" compact />
          ) : (
            <p className="portal-text-body px-2 py-8 text-center text-text-secondary">
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
        hideMobileChrome={false}
        activeNavId={
          section === "gpt" || section === "planer" ? "uebersicht" : section
        }
        contentKey={`${section}:${selectedId ?? ""}:${vorgangListFilter}:${searchParams.get("focus") ?? ""}`}
        contentBusy={pageBusy}
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
                className="btn-pill-outline portal-btn-compact"
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
              onOpenPlaner={() => switchSection("planer")}
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

      <PortalLegalFooter
        variant="partner"
        className="mx-auto max-w-[1200px] px-4 pb-8 pt-3 lg:px-6"
      />
    </>
  );
}
