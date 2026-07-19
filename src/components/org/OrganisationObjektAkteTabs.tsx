"use client";

import { useState } from "react";

import { OrganisationObjektDashboard } from "@/components/org/OrganisationObjektDashboard";
import { OrganisationObjektDokumentePanel } from "@/components/org/OrganisationObjektDokumentePanel";
import { OrganisationObjektEinheitenBewohnerPanel } from "@/components/org/OrganisationObjektEinheitenBewohnerPanel";
import { OrganisationObjektFremdVorgaengePanel } from "@/components/org/OrganisationObjektFremdVorgaengePanel";
import { OrganisationObjektKalenderPanel } from "@/components/org/OrganisationObjektKalenderPanel";
import { OrganisationObjektKontaktePanel } from "@/components/org/OrganisationObjektKontaktePanel";
import { OrganisationObjektNotizenPanel } from "@/components/org/OrganisationObjektNotizenPanel";
import { OrganisationObjektPruefpflichtenPanel } from "@/components/org/OrganisationObjektPruefpflichtenPanel";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "einheiten", label: "Einheiten & Bewohner" },
  { id: "kontakte", label: "Kontakte" },
  { id: "notizen", label: "Notizen" },
  { id: "dokumente", label: "Dokumente" },
  { id: "fremd", label: "Fremd" },
  { id: "pruef", label: "Prüfpflichten" },
  { id: "kalender", label: "Kalender" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function OrganisationObjektAkteTabs({ objektId }: { objektId: string }) {
  const [tab, setTab] = useState<TabId>("dashboard");

  return (
    <div className="mt-4 space-y-4 border-t border-border-default pt-4">
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold",
              tab === t.id
                ? "bg-accent-light text-accent"
                : "bg-muted text-text-secondary hover:text-text-primary"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "dashboard" ? <OrganisationObjektDashboard objektId={objektId} /> : null}
      {tab === "einheiten" ? (
        <OrganisationObjektEinheitenBewohnerPanel objektId={objektId} />
      ) : null}
      {tab === "kontakte" ? <OrganisationObjektKontaktePanel objektId={objektId} /> : null}
      {tab === "notizen" ? <OrganisationObjektNotizenPanel objektId={objektId} /> : null}
      {tab === "dokumente" ? <OrganisationObjektDokumentePanel objektId={objektId} /> : null}
      {tab === "fremd" ? <OrganisationObjektFremdVorgaengePanel objektId={objektId} /> : null}
      {tab === "pruef" ? <OrganisationObjektPruefpflichtenPanel objektId={objektId} /> : null}
      {tab === "kalender" ? <OrganisationObjektKalenderPanel objektId={objektId} /> : null}
    </div>
  );
}
