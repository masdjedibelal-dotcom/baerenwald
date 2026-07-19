"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { PortalCreateFunnelModal } from "@/components/portal/PortalCreateFunnelModal";
import { PortalUserNotificationBell } from "@/components/portal/PortalUserNotificationBell";
import { PortalVorgangDetail } from "@/components/portal/PortalVorgangDetail";
import { PortalKundePrivatDashboard } from "@/components/portal/PortalKundePrivatDashboard";
import { PORTAL_HEADER_HERO_SRC } from "@/lib/portal2/portal-media";
import { PortalListCard } from "@/components/shared/PortalListCard";
import {
  PORTAL_LIST_PAGE_SIZE,
  PortalListPagination,
} from "@/components/shared/PortalListPagination";
import { PortalShell } from "@/components/shared/PortalShell";
import { PortalEmptyState } from "@/components/shared/PortalStateView";
import { buildKundeVorgaenge } from "@/lib/portal/build-kunde-vorgaenge";
import {
  countKundeVorgaengeNeedsAction,
} from "@/lib/portal/kunde-vorgang-filter";
import { buildKundeVorgangCardRows } from "@/lib/portal/portal-list-mappers";
import type { EigentuemerPortalObjekt } from "@/lib/portal/get-eigentuemer-portal-data";
import { resolveEigentuemerVorgangBetrag } from "@/lib/portal/get-eigentuemer-portal-data";
import { portalCreateLabel } from "@/lib/portal2/create";
import { inferFlowFromKundeItem } from "@/lib/portal2/hv-detail-adapters";
import {
  buildPrivatDashboardKpis,
  PRIVAT_LISTE_CHIPS,
  privatListeChipMatches,
  type PrivatListeChip,
} from "@/lib/portal2/kunde-dashboard";
import {
  EIGENTUEMER_DASHBOARD_ROLE,
  EIGENTUEMER_DETAIL_STATUS_NOTE,
  EIGENTUEMER_DETAIL_STATUS_TITLE,
  EIGENTUEMER_KOSTENFREIGABE_ABLEHNEN,
  EIGENTUEMER_KOSTENFREIGABE_BTN,
  EIGENTUEMER_KOSTENFREIGABE_TITLE,
  EIGENTUEMER_PAGE_HEAD,
  eigentuemerNeedsKostenfreigabe,
  formatEigentuemerSchwelle,
} from "@/lib/portal2/eigentuemer";
import { countLeadsByPortalFlow } from "@/lib/portal2/hv-dashboard";
import { buildPortalShellNav } from "@/lib/portal2/nav-items";
import {
  formatObjektPlzOrt,
  formatObjektStrasse,
  formatObjektTypLine,
  parseEinheitenCount,
} from "@/lib/portal2/objekte";
import { portalDetailStatusPillClass } from "@/lib/shared/portal-detail-format";
import { portalToastError, portalToastSuccess } from "@/lib/shared/portal-toast";
import { cn } from "@/lib/utils";

type SectionId = "uebersicht" | "vorgaenge" | "objekte";

type Props = {
  kunde: {
    name?: string | null;
    email?: string | null;
    freigabe_schwelle_eur?: number | null;
    eigentuemer_freigabe_schwelle_eur?: number | null;
  };
  schwelleEur: number;
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

function leadBetrag(
  leadId: string,
  leads: Props["leads"],
  angebote: Props["angebote"]
): number | null {
  const ang = angebote.find(
    (a) => String((a as { lead_id?: string | null }).lead_id ?? "") === leadId
  ) as { gesamtBrutto?: number } | undefined;
  const lead = leads.find((l) => String(l.id) === leadId) as
    | { preis_max?: number | null; budget_ca?: number | null }
    | undefined;
  return resolveEigentuemerVorgangBetrag({
    angebotBrutto: ang?.gesamtBrutto,
    preisMax: lead?.preis_max,
    budgetCa: lead?.budget_ca,
  });
}

function freigabeStatusOf(
  leadId: string,
  leads: Props["leads"]
): string | null {
  const lead = leads.find((l) => String(l.id) === leadId) as
    | { eigentuemer_freigabe_status?: string | null }
    | undefined;
  return lead?.eigentuemer_freigabe_status ?? null;
}

/**
 * D8 Eigentümer-Portal — Dashboard · Vorgänge · Objekte (Lesesicht).
 * Create: „Anfrage erstellen“ → eingebetteter Portal-Funnel (Preis + Objekte).
 */
export function EigentuemerPortalClient({
  kunde,
  schwelleEur,
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
  const [_mobileDetailOpen, setMobileDetailOpen] = useState(Boolean(selectedId));
  const [listPage, setListPage] = useState(1);
  const [objektDetailId, setObjektDetailId] = useState<string | null>(null);
  const [freigabeBusy, setFreigabeBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const s = normalizeSection(searchParams.get("section"));
    if (s) setSection(s);
    const id = searchParams.get("id")?.trim() || null;
    if (id) {
      setSelectedId(id);
      setMobileDetailOpen(true);
    }
  }, [searchParams]);

  const switchSection = (id: SectionId) => {
    setSection(id);
    setObjektDetailId(null);
    if (id !== "vorgaenge") {
      setSelectedId(null);
      setMobileDetailOpen(false);
    }
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
      }),
    [leads, angebote, auftraege]
  );

  const needsActionCount = useMemo(
    () => countKundeVorgaengeNeedsAction(vorgaengeItems),
    [vorgaengeItems]
  );

  const flowByItemId = useMemo(() => {
    const map = new Map<string, ReturnType<typeof inferFlowFromKundeItem>>();
    for (const item of vorgaengeItems) {
      const leadId = item.leadId ?? item.id;
      const lead = (
        leads as Array<{
          id: string;
          org_freigabe_status?: string | null;
          hv_meldung_status?: string | null;
        }>
      ).find((l) => l.id === leadId);
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

  const cardRows = useMemo(
    () => buildKundeVorgangCardRows(filteredItems),
    [filteredItems]
  );

  const pageCount = Math.max(1, Math.ceil(cardRows.length / PORTAL_LIST_PAGE_SIZE));
  const pageRows = cardRows.slice(
    (listPage - 1) * PORTAL_LIST_PAGE_SIZE,
    listPage * PORTAL_LIST_PAGE_SIZE
  );

  const recentItems = useMemo(
    () =>
      vorgaengeItems.slice(0, 4).map((item) => ({
        id: item.id,
        titel: item.title,
        objekt: item.cardSubtitle ?? item.plz ?? "—",
        flowStatus: flowByItemId.get(item.id) ?? ("gemeldet" as const),
        notfall: false,
      })),
    [vorgaengeItems, flowByItemId]
  );

  const pendingFreigabe = useMemo(() => {
    return vorgaengeItems.filter((item) => {
      const lid = item.leadId ?? item.id;
      return eigentuemerNeedsKostenfreigabe({
        betragEur: leadBetrag(lid, leads, angebote),
        schwelleEur,
        freigabeStatus: freigabeStatusOf(lid, leads),
      });
    });
  }, [vorgaengeItems, leads, angebote, schwelleEur]);

  const selectedItem = selectedId
    ? vorgaengeItems.find((i) => i.id === selectedId) ?? null
    : null;
  const selectedLeadId = selectedItem
    ? selectedItem.leadId ?? selectedItem.id
    : null;

  const selectedNeedsFreigabe =
    selectedLeadId != null &&
    eigentuemerNeedsKostenfreigabe({
      betragEur: leadBetrag(selectedLeadId, leads, angebote),
      schwelleEur,
      freigabeStatus: freigabeStatusOf(selectedLeadId, leads),
    });

  const helloName =
    kunde.name?.trim().split(/\s+/)[0] ||
    kunde.email?.split("@")[0] ||
    "dort";

  const submitFreigabe = async (aktion: "freigegeben" | "abgelehnt") => {
    if (!selectedLeadId) return;
    setFreigabeBusy(true);
    try {
      const res = await fetch("/api/portal/eigentuemer/freigabe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: selectedLeadId, aktion }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        portalToastError(json.error || "Freigabe fehlgeschlagen.");
        return;
      }
      portalToastSuccess(
        aktion === "freigegeben"
          ? "Kosten freigegeben."
          : "Kostenfreigabe abgelehnt."
      );
      router.refresh();
    } finally {
      setFreigabeBusy(false);
    }
  };

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
      activeNavId={section}
      onNavChange={(id) => switchSection(id as SectionId)}
      nav={buildPortalShellNav("eigentuemer", "eigentuemer", {
        liste: needsActionCount + pendingFreigabe.length,
      })}
      createAction={{
        label: portalCreateLabel("eigentuemer"),
        onClick: () => setCreateOpen(true),
      }}
      headerUser={{ name: kunde.name?.trim() || EIGENTUEMER_DASHBOARD_ROLE }}
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
          kundeTyp="privat"
          roleLabel={EIGENTUEMER_DASHBOARD_ROLE}
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

      {section === "vorgaenge" ? (
        selectedItem && selectedLeadId ? (
          <div className="-mx-4 -mt-4 min-w-0 space-y-4 lg:-mx-6 lg:-mt-5">
            {selectedNeedsFreigabe ? (
              <div className="mx-4 rounded-xl border border-[#F5C2C0] bg-[#FEF3F2] p-4 lg:mx-6">
                <p className="portal-text-body font-semibold text-[#B42318]">
                  {EIGENTUEMER_KOSTENFREIGABE_TITLE}
                </p>
                <p className="portal-text-meta mt-1 text-text-secondary">
                  {selectedItem.title} überschreitet Ihren Schwellenwert (
                  {formatEigentuemerSchwelle(schwelleEur)}).
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={freigabeBusy}
                    className="btn-pill-primary !text-sm"
                    onClick={() => void submitFreigabe("freigegeben")}
                  >
                    {EIGENTUEMER_KOSTENFREIGABE_BTN}
                  </button>
                  <button
                    type="button"
                    disabled={freigabeBusy}
                    className="btn-pill-outline !text-sm"
                    onClick={() => void submitFreigabe("abgelehnt")}
                  >
                    {EIGENTUEMER_KOSTENFREIGABE_ABLEHNEN}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mx-4 rounded-xl border border-border-default bg-muted/40 p-4 lg:mx-6">
              <p className="portal-text-label text-text-tertiary">
                {EIGENTUEMER_DETAIL_STATUS_TITLE}
              </p>
              <p className="portal-text-body mt-1 text-text-secondary">
                {EIGENTUEMER_DETAIL_STATUS_NOTE}
              </p>
            </div>

            <PortalVorgangDetail
              item={selectedItem}
              privatkunde
              onBack={() => {
                setMobileDetailOpen(false);
                setSelectedId(null);
                router.replace("/portal?section=vorgaenge", {
                  scroll: false,
                });
              }}
            />
          </div>
        ) : (
          <div className="flex min-w-0 flex-col">
            <div className="px-0.5 pb-1">
              <p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">
                Eigentümer
              </p>
              <h1 className="text-[25px] font-bold text-text-primary">
                Meine Wohnung
              </h1>
              <p className="portal-text-body mt-1 text-text-secondary">
                Nur Vorgänge Ihrer zugeordneten Objekte · Schwelle{" "}
                {formatEigentuemerSchwelle(schwelleEur)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 py-3.5">
              {PRIVAT_LISTE_CHIPS.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => {
                    setListeChip(chip.id);
                    setListPage(1);
                  }}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[12.5px] font-semibold",
                    listeChip === chip.id
                      ? "border border-transparent bg-[#1A3D2B] text-white"
                      : "border border-border-default bg-white text-text-secondary"
                  )}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {pageRows.length === 0 ? (
              <PortalEmptyState
                role="eigentuemer"
                createLabel={portalCreateLabel("eigentuemer")}
                canCreate
                onPrimary={() => setCreateOpen(true)}
              />
            ) : (
              <div className="portal-list-panel portal-list-rows">
                {pageRows.map((row) => (
                  <PortalListCard
                    key={row.id}
                    selected={false}
                    title={row.title}
                    subtitle={row.subtitle}
                    statusLabel={row.statusLabel}
                    statusPillClass={portalDetailStatusPillClass(row.statusPillKey)}
                    accent={row.accent}
                    meta={row.meta}
                    hint={row.hint}
                    footer={row.footer}
                    showLeftAccent={false}
                    onClick={() => {
                      setSelectedId(row.id);
                      setMobileDetailOpen(true);
                      router.replace(
                        `/portal?section=vorgaenge&id=${encodeURIComponent(row.id)}`,
                        { scroll: false }
                      );
                    }}
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
            <div className="space-y-4">
              <button
                type="button"
                className="portal-text-meta font-semibold text-accent"
                onClick={() => setObjektDetailId(null)}
              >
                ‹ Objekte
              </button>
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-[22px] font-bold text-text-primary">
                  {activeObjekt.titel}
                </h2>
                <p className="portal-text-body mt-1 text-text-secondary">
                  {formatObjektTypLine(activeObjekt)}
                  {formatObjektPlzOrt(activeObjekt)
                    ? ` · ${formatObjektPlzOrt(activeObjekt)}`
                    : ""}
                </p>
              </div>
              <dl className="portal-surface space-y-3 p-4">
                <div>
                  <dt className="portal-text-meta text-text-tertiary">Adresse</dt>
                  <dd className="portal-text-body font-medium">
                    {formatObjektStrasse(activeObjekt) || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="portal-text-meta text-text-tertiary">Einheiten</dt>
                  <dd className="portal-text-body font-medium">
                    {parseEinheitenCount(activeObjekt.einheiten_hinweis) || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="portal-text-meta text-text-tertiary">
                    Ihre Kostenfreigabe-Schwelle
                  </dt>
                  <dd className="portal-text-body font-medium">
                    {formatEigentuemerSchwelle(schwelleEur)}
                  </dd>
                </div>
              </dl>
              <p className="portal-text-meta text-text-tertiary">
                Lesesicht — Änderungen nimmt die Hausverwaltung vor.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-0.5">
                <h2 className="portal-text-section text-text-primary">Objekte</h2>
                <p className="portal-text-body text-text-secondary">
                  Ihre zugeordneten Gebäude (nur Lesen).
                </p>
              </div>
              {objekte.length === 0 ? (
                <div className="portal-surface p-6 text-center portal-text-body text-text-secondary">
                  Noch keine Objekte zugeordnet. Die Hausverwaltung legt die
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
    </PortalShell>

      <PortalCreateFunnelModal
        open={createOpen}
        channel="portal_eigentuemer"
        title={portalCreateLabel("eigentuemer")}
        objekte={objekte.map((o) => ({
          id: o.id,
          titel: o.titel,
          strasse: o.strasse,
          hausnummer: o.hausnummer,
          plz: o.plz,
          ort: o.ort,
        }))}
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
    </>
  );
}
