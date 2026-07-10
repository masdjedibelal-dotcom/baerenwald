"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Building2,
  ClipboardList,
  LayoutDashboard,
  Package,
  PlusCircle,
  UserRound,
} from "lucide-react";

import { OrganisationWiedervorlagenCard } from "@/components/org/OrganisationWiedervorlagenCard";
import { HvNotificationBell } from "@/components/org/HvNotificationBell";
import { OrganisationAktiveAbosPanel } from "@/components/org/OrganisationAktiveAbosPanel";
import { OrganisationLeistungenPanel } from "@/components/org/OrganisationLeistungenPanel";
import { OrganisationSuche } from "@/components/org/OrganisationSuche";
import { OrganisationAnfrageHub } from "@/components/org/OrganisationAnfrageHub";
import { OrganisationObjektePanel } from "@/components/org/OrganisationObjektePanel";
import { OrganisationProfilPanel } from "@/components/org/OrganisationProfilPanel";
import { OrganisationVorgaengeSection } from "@/components/org/OrganisationVorgaengeSection";
import { PortalListCard } from "@/components/shared/PortalListCard";
import { PortalNavCountBadge } from "@/components/shared/PortalNavCountBadge";
import {
  buildOrgVorgangFilterCounts,
  type OrgVorgangFilter,
} from "@/lib/org/org-vorgang-filter";
import type { KatalogProdukt } from "@/lib/katalog/katalog-produkte";
import type {
  OrganisationKunde,
  OrganisationLead,
  OrganisationObjekt,
} from "@/lib/org/types";
import type { OrgPartnerBefundEntry } from "@/lib/org/load-partner-befund";
import type { OrgMitgliedRolle } from "@/lib/org/org-rbac";
import { buildKundeVorgaenge } from "@/lib/portal/build-kunde-vorgaenge";
import { filterKundeVorgaenge } from "@/lib/portal/kunde-vorgang-filter";
import { buildKundeVorgangCardRows } from "@/lib/portal/portal-list-mappers";
import { portalDetailStatusPillClass } from "@/lib/shared/portal-detail-format";
import { cn } from "@/lib/utils";

type OrgSection = "uebersicht" | "vorgaenge" | "objekte" | "leistungen" | "profil";

const NAV: Array<{ id: OrgSection; label: string; icon: typeof LayoutDashboard }> = [
  { id: "uebersicht", label: "Übersicht", icon: LayoutDashboard },
  { id: "vorgaenge", label: "Vorgänge", icon: ClipboardList },
  { id: "objekte", label: "Objekte", icon: Building2 },
  { id: "leistungen", label: "Leistungen", icon: Package },
  { id: "profil", label: "Profil", icon: UserRound },
];

type Props = {
  kunde: OrganisationKunde;
  objekte: OrganisationObjekt[];
  eingang: OrganisationLead[];
  leads: OrganisationLead[];
  angebote: Parameters<typeof OrganisationVorgaengeSection>[0]["angebote"];
  auftraege: Parameters<typeof OrganisationVorgaengeSection>[0]["auftraege"];
  katalogProdukte?: KatalogProdukt[];
  mitgliedRolle?: OrgMitgliedRolle;
  partnerBefundByLeadId?: Record<string, OrgPartnerBefundEntry[]>;
};

function portalSectionFromParam(raw: string | null): OrgSection | null {
  if (raw === "uebersicht" || raw === "objekte" || raw === "profil" || raw === "leistungen") return raw;
  if (
    raw === "vorgaenge" ||
    raw === "freigabe" ||
    raw === "auftraege" ||
    raw === "meldungen" ||
    raw === "eingang" ||
    raw === "anfragen" ||
    raw === "angebote" ||
    raw === "einstellungen"
  ) {
    return "vorgaenge";
  }
  return null;
}

export function OrganisationPortalClient({
  kunde,
  objekte,
  eingang,
  leads,
  angebote,
  auftraege,
  katalogProdukte = [],
  mitgliedRolle = "admin",
  partnerBefundByLeadId = {},
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSection = portalSectionFromParam(searchParams.get("section"));
  const initialItemId = searchParams.get("id");
  const initialVorgangFilter = ((): OrgVorgangFilter | null => {
    const f = searchParams.get("filter");
    if (f === "freigabe" || f === "aktiv" || f === "erledigt") return f;
    return null;
  })();

  const [section, setSection] = useState<OrgSection>(initialSection ?? "uebersicht");
  const [hubOpen, setHubOpen] = useState(false);

  const displayName =
    kunde.org_anzeigename?.trim() || kunde.name?.trim() || "Hausverwaltung";

  const vorgaengeItems = useMemo(
    () =>
      buildKundeVorgaenge({
        leads: leads as Parameters<typeof buildKundeVorgaenge>[0]["leads"],
        angebote: angebote as Parameters<typeof buildKundeVorgaenge>[0]["angebote"],
        auftraege,
      }),
    [leads, angebote, auftraege]
  );

  const filterCounts = useMemo(
    () => buildOrgVorgangFilterCounts(eingang, leads, vorgaengeItems),
    [eingang, leads, vorgaengeItems]
  );

  const vorgaengeBadgeCount = filterCounts.freigabe;

  const refresh = () => router.refresh();

  function switchSection(next: OrgSection) {
    setSection(next);
    router.replace(`/portal?section=${next}`, { scroll: false });
  }

  function openVorgaenge(filter?: OrgVorgangFilter) {
    setSection("vorgaenge");
    const q = filter ? `?section=vorgaenge&filter=${filter}` : "?section=vorgaenge";
    router.replace(`/portal${q}`, { scroll: false });
  }

  const activeTeaserRows = buildKundeVorgangCardRows(
    filterKundeVorgaenge(vorgaengeItems, "aktiv")
  ).slice(0, 5);

  return (
    <div className="portal-ui min-h-screen bg-surface-page pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-8">
      <header className="sticky top-0 z-50 border-b border-border-default bg-surface-card/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[68px] max-w-[1200px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            {kunde.org_logo_url ? (
              <Image
                src={kunde.org_logo_url}
                alt=""
                width={28}
                height={28}
                className="rounded"
                unoptimized
              />
            ) : (
              <Image src="/logo-mark-green.png" alt="" width={28} height={28} />
            )}
            <div>
              <p className="portal-text-body font-semibold">{displayName}</p>
              <p className="text-xs text-text-tertiary">Hausverwaltung</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <HvNotificationBell />
            <OrganisationSuche
              onSelect={(id) => {
                openVorgaenge("aktiv");
                router.replace(`/portal?section=vorgaenge&filter=aktiv&id=${id}`, {
                  scroll: false,
                });
              }}
            />
            <form action="/portal/auth/signout" method="post">
              <button type="submit" className="btn-pill-outline portal-btn-compact">
                Abmelden
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1200px] gap-4 px-4 py-5 lg:grid-cols-[220px_1fr] lg:px-6">
        <aside className="hidden lg:block">
          <nav className="sticky top-[84px] space-y-1">
            {NAV.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => switchSection(id)}
                className={cn(
                  "mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left portal-text-body font-semibold",
                  section === id
                    ? "bg-accent-light text-accent"
                    : "text-text-secondary hover:bg-muted"
                )}
              >
                <span className="relative inline-flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {label}
                  {id === "vorgaenge" ? (
                    <PortalNavCountBadge count={vorgaengeBadgeCount} />
                  ) : null}
                </span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 space-y-4">
          {section === "uebersicht" ? (
            <>
              <div className="space-y-0.5">
                <p className="portal-text-section text-text-primary">Heute</p>
                <p className="portal-text-body text-text-secondary">
                  Was jetzt Ihre Aufmerksamkeit braucht — Freigaben, Notfälle, laufende Vorgänge
                </p>
              </div>

              <div className="grid min-w-0 grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => openVorgaenge("freigabe")}
                  className="portal-kpi-card text-left"
                >
                  <p className="portal-kpi-label">Zur Freigabe</p>
                  <p className="portal-kpi-value">{filterCounts.freigabe}</p>
                </button>
                <button
                  type="button"
                  onClick={() => openVorgaenge("aktiv")}
                  className="portal-kpi-card text-left"
                >
                  <p className="portal-kpi-label">Aktiv</p>
                  <p className="portal-kpi-value">{filterCounts.aktiv}</p>
                </button>
                <button
                  type="button"
                  onClick={() => openVorgaenge("erledigt")}
                  className="portal-kpi-card text-left"
                >
                  <p className="portal-kpi-label">Erledigt</p>
                  <p className="portal-kpi-value">{filterCounts.erledigt}</p>
                </button>
              </div>

              <OrganisationWiedervorlagenCard />

              <button
                type="button"
                className="btn-pill-primary inline-flex items-center gap-2"
                onClick={() => setHubOpen(true)}
              >
                <PlusCircle className="h-4 w-4" />
                Neue Anfrage
              </button>

              <article className="card-bordered p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="font-semibold text-text-primary">Aktive Vorgänge</h2>
                  <button
                    type="button"
                    onClick={() => openVorgaenge("aktiv")}
                    className="portal-text-meta font-semibold text-accent"
                  >
                    Alle anzeigen
                  </button>
                </div>
                <div className="space-y-2">
                  {activeTeaserRows.map((row) => (
                    <PortalListCard
                      key={row.id}
                      title={row.title}
                      subtitle={row.subtitle}
                      statusLabel={row.statusLabel}
                      statusPillClass={portalDetailStatusPillClass(row.statusPillKey)}
                      accent={row.accent}
                      meta={row.meta}
                      hint={row.hint}
                      footer={row.footer}
                      onClick={() => openVorgaenge("aktiv")}
                    />
                  ))}
                  {filterCounts.aktiv === 0 ? (
                    <p className="portal-text-body py-4 text-center text-text-secondary">
                      Noch keine aktiven Vorgänge.
                    </p>
                  ) : null}
                </div>
              </article>
            </>
          ) : null}

          {section === "vorgaenge" ? (
            <OrganisationVorgaengeSection
              key={initialVorgangFilter ?? "default"}
              kunde={kunde}
              eingang={eingang}
              objekte={objekte}
              leads={leads}
              angebote={angebote}
              auftraege={auftraege}
              initialFilter={initialVorgangFilter}
              initialSelectedId={initialItemId}
              onRefresh={refresh}
              onFilterChange={(f) =>
                router.replace(`/portal?section=vorgaenge&filter=${f}`, { scroll: false })
              }
              partnerBefundByLeadId={partnerBefundByLeadId}
            />
          ) : null}

          {section === "objekte" ? (
            <OrganisationObjektePanel objekte={objekte} onRefresh={refresh} />
          ) : null}

          {section === "leistungen" ? (
            <div className="space-y-8">
              <OrganisationAktiveAbosPanel />
              <OrganisationLeistungenPanel
                kunde={kunde}
                objekte={objekte}
                produkte={katalogProdukte}
                onOrdered={refresh}
              />
            </div>
          ) : null}

          {section === "profil" ? (
            <>
              <div className="space-y-0.5">
                <p className="portal-text-section text-text-primary">Profil</p>
                <p className="portal-text-body text-text-secondary">
                  Organisation, Melde-Material und Freigabe-Regeln
                </p>
              </div>
              <OrganisationProfilPanel
                kunde={kunde}
                objektCount={objekte.length}
                onSaved={refresh}
                isAdmin={mitgliedRolle === "admin"}
              />
            </>
          ) : null}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border-default bg-surface-card/95 backdrop-blur-sm lg:hidden">
        <div className="mx-auto flex max-w-[1200px]">
          {NAV.map(({ id, label, icon: Icon }) => {
            const active = section === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => switchSection(id)}
                className={cn(
                  "relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium",
                  active ? "text-accent" : "text-text-tertiary"
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
                {id === "vorgaenge" && vorgaengeBadgeCount > 0 ? (
                  <span className="absolute right-[calc(50%-22px)] top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">
                    {vorgaengeBadgeCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </nav>

      {hubOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5">
            <p className="mb-3 text-lg font-semibold">Neue Anfrage</p>
            <OrganisationAnfrageHub
              objekte={objekte}
              kundeEmail={kunde.email}
              kundeName={kunde.name}
              onClose={() => setHubOpen(false)}
              onDone={() => {
                setHubOpen(false);
                refresh();
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
