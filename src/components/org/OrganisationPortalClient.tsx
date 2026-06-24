"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Briefcase,
  Building2,
  ClipboardList,
  FileText,
  Inbox,
  LayoutDashboard,
  PlusCircle,
  Settings,
} from "lucide-react";

import { OrganisationAnfrageHub } from "@/components/org/OrganisationAnfrageHub";
import { OrganisationEingangPanel } from "@/components/org/OrganisationEingangPanel";
import { OrganisationEinstellungenPanel } from "@/components/org/OrganisationEinstellungenPanel";
import { OrganisationObjektePanel } from "@/components/org/OrganisationObjektePanel";
import { PortalClient } from "@/components/portal/PortalClient";
import type { OrganisationKunde, OrganisationLead, OrganisationObjekt } from "@/lib/org/types";
import { cn } from "@/lib/utils";

import "@/components/org/organisation-portal.css";

type OrgSection =
  | "uebersicht"
  | "eingang"
  | "anfragen"
  | "angebote"
  | "auftraege"
  | "objekte"
  | "einstellungen"
  | "neue-anfrage";

const NAV: Array<{ id: OrgSection; label: string; icon: typeof LayoutDashboard }> = [
  { id: "uebersicht", label: "Übersicht", icon: LayoutDashboard },
  { id: "eingang", label: "Eingang", icon: Inbox },
  { id: "anfragen", label: "Anfragen", icon: ClipboardList },
  { id: "angebote", label: "Angebote", icon: FileText },
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

export function OrganisationPortalClient({
  kunde,
  objekte,
  eingang,
  leads,
  angebote,
  auftraege,
}: Props) {
  const router = useRouter();
  const [section, setSection] = useState<OrgSection>("uebersicht");
  const [hubOpen, setHubOpen] = useState(false);

  const displayName =
    kunde.org_anzeigename?.trim() || kunde.name?.trim() || "Auftraggeber";

  const kpis = useMemo(
    () => ({
      eingang: eingang.filter((l) => l.status === "neu" || !l.status).length,
      freigabe: [...eingang, ...leads].filter(
        (l) => l.org_freigabe_status === "ausstehend"
      ).length,
      auftraege: auftraege.length,
    }),
    [eingang, leads, auftraege]
  );

  const pipelineSection =
    section === "anfragen" || section === "angebote" || section === "auftraege"
      ? section
      : null;

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
              <p className="text-xs text-text-tertiary">Auftraggeber-Portal</p>
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
                  <p className="text-xs text-text-tertiary">Neue Meldungen</p>
                  <p className="text-2xl font-semibold">{kpis.eingang}</p>
                </article>
                <article className="org-kpi-card">
                  <p className="text-xs text-text-tertiary">Wartet Freigabe</p>
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

          {section === "eingang" && (
            <OrganisationEingangPanel
              eingang={eingang}
              objekte={objekte}
              onRefresh={refresh}
            />
          )}

          {pipelineSection ? (
            <PortalClient
              layout="embedded"
              activeSection={pipelineSection}
              showProductPicker={false}
              showAnlassBadge
              kunde={kunde}
              leads={leads as Parameters<typeof PortalClient>[0]["leads"]}
              angebote={angebote}
              auftraege={auftraege}
            />
          ) : null}

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
        {NAV.slice(0, 5).map(({ id, label, icon: Icon }) => (
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
