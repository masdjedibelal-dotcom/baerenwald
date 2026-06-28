"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Briefcase,
  Building2,
  ClipboardList,
  LayoutDashboard,
  PlusCircle,
  Settings,
} from "lucide-react";

import { OrganisationAnfrageHub } from "@/components/org/OrganisationAnfrageHub";
import { OrganisationFreigabePanel } from "@/components/org/OrganisationFreigabePanel";
import { OrganisationEinstellungenPanel } from "@/components/org/OrganisationEinstellungenPanel";
import { OrganisationObjektePanel } from "@/components/org/OrganisationObjektePanel";
import { PortalClient } from "@/components/portal/PortalClient";
import type { OrganisationKunde, OrganisationLead, OrganisationObjekt } from "@/lib/org/types";
import { cn } from "@/lib/utils";

import "@/components/org/organisation-portal.css";

type OrgSection =
  | "uebersicht"
  | "freigabe"
  | "auftraege"
  | "objekte"
  | "einstellungen"
  | "neue-anfrage";

const NAV: Array<{ id: OrgSection; label: string; icon: typeof LayoutDashboard }> = [
  { id: "uebersicht", label: "Übersicht", icon: LayoutDashboard },
  { id: "freigabe", label: "Zur Freigabe", icon: ClipboardList },
  { id: "auftraege", label: "Aufträge", icon: Briefcase },
  { id: "objekte", label: "Objekte", icon: Building2 },
  { id: "einstellungen", label: "Einstellungen", icon: Settings },
];

type Props = {
  kunde: OrganisationKunde;
  objekte: OrganisationObjekt[];
  eingang: OrganisationLead[];
  leads: OrganisationLead[];
  angebote: Parameters<typeof PortalClient>[0]["angebote"];
  auftraege: Parameters<typeof PortalClient>[0]["auftraege"];
};

function sectionFromParam(raw: string | null): OrgSection | null {
  if (
    raw === "freigabe" ||
    raw === "meldungen" ||
    raw === "eingang" ||
    raw === "anfragen" ||
    raw === "angebote"
  ) {
    return "freigabe";
  }
  if (
    raw === "uebersicht" ||
    raw === "auftraege" ||
    raw === "objekte" ||
    raw === "einstellungen"
  ) {
    return raw;
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
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSection = sectionFromParam(searchParams.get("section"));
  const initialItemId = searchParams.get("id");

  const [section, setSection] = useState<OrgSection>(initialSection ?? "uebersicht");
  const [hubOpen, setHubOpen] = useState(false);

  const displayName =
    kunde.org_anzeigename?.trim() || kunde.name?.trim() || "Hausverwaltung";

  const kpis = useMemo(() => {
    const neueMeldungen = eingang.filter(
      (l) => (l.hv_meldung_status ?? "neu") === "neu"
    ).length;
    const angebotFreigabe = [...eingang, ...leads].filter(
      (l) => l.org_freigabe_status === "ausstehend"
    ).length;
    const aktiveAuftraege = auftraege.filter((a) => {
      const s = (a.status ?? "").toLowerCase();
      return !s.includes("abgeschlossen") && !s.includes("storniert");
    }).length;
    return {
      freigabe: neueMeldungen + angebotFreigabe,
      auftraege: aktiveAuftraege,
    };
  }, [eingang, leads, auftraege]);

  const refresh = () => router.refresh();

  return (
    <div className="portal-ui min-h-screen bg-surface-page">
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
          <form action="/portal/auth/signout" method="post">
            <button type="submit" className="btn-pill-outline portal-btn-compact">
              Abmelden
            </button>
          </form>
        </div>
      </header>

      <div className="organisation-portal-layout mx-auto max-w-[1200px] px-4 lg:px-6 py-5 gap-4">
        <aside className="organisation-portal-sidebar">
          <nav className="space-y-1">
            {NAV.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className="organisation-portal-nav-btn"
                data-active={section === id}
                onClick={() => setSection(id)}
              >
                <Icon className="h-4 w-4" />
                {label}
                {id === "freigabe" && kpis.freigabe > 0 ? (
                  <span className="ml-auto text-xs font-semibold text-red-600">
                    {kpis.freigabe}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 space-y-4">
          {section === "uebersicht" && (
            <>
              {objekte.length === 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
                  Legen Sie unter <strong>Objekte</strong> Ihr erstes Gebäude an,
                  um Melde-Links zu nutzen.
                </div>
              ) : null}

              <div className="org-kpi-grid">
                <article className="org-kpi-card">
                  <p className="text-xs text-text-tertiary">Zur Freigabe</p>
                  <p className="text-2xl font-semibold">{kpis.freigabe}</p>
                </article>
                <article className="org-kpi-card">
                  <p className="text-xs text-text-tertiary">Aktive Aufträge</p>
                  <p className="text-2xl font-semibold">{kpis.auftraege}</p>
                </article>
              </div>

              <button
                type="button"
                className="btn-pill-primary inline-flex items-center gap-2"
                onClick={() => setHubOpen(true)}
              >
                <PlusCircle className="h-4 w-4" />
                Neue Anfrage
              </button>
            </>
          )}

          {section === "freigabe" && (
            <OrganisationFreigabePanel
              kunde={kunde}
              eingang={eingang}
              objekte={objekte}
              leads={leads}
              angebote={angebote}
              initialSelectedId={initialItemId}
              onRefresh={refresh}
            />
          )}

          {section === "auftraege" && (
            <div className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold">Aufträge</h2>
                <p className="text-sm text-text-secondary">
                  Laufende und abgeschlossene Aufträge verfolgen.
                </p>
              </div>
              <PortalClient
                layout="embedded"
                activeSection="auftraege"
                showProductPicker={false}
                showAnlassBadge
                kunde={kunde}
                leads={leads as Parameters<typeof PortalClient>[0]["leads"]}
                angebote={angebote}
                auftraege={auftraege}
              />
            </div>
          )}

          {section === "objekte" && (
            <OrganisationObjektePanel
              kunde={kunde}
              objekte={objekte}
              onRefresh={refresh}
            />
          )}

          {section === "einstellungen" && (
            <OrganisationEinstellungenPanel kunde={kunde} onSaved={refresh} />
          )}
        </main>
      </div>

      <nav className="organisation-mobile-nav lg:hidden">
        {NAV.slice(0, 4).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px]",
              section === id ? "text-accent font-semibold" : "text-text-tertiary"
            )}
            onClick={() => setSection(id)}
          >
            <Icon className="h-5 w-5" />
            {label}
          </button>
        ))}
      </nav>

      {hubOpen ? (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto">
            <p className="font-semibold text-lg mb-3">Neue Anfrage</p>
            <OrganisationAnfrageHub
              objekte={objekte}
              kundeEmail={kunde.email}
              kundeName={kunde.name}
              onClose={() => setHubOpen(false)}
              onDone={refresh}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
