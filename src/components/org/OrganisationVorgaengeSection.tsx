"use client";

import { useEffect, useMemo, useState } from "react";

import { OrganisationFreigabePanel } from "@/components/org/OrganisationFreigabePanel";
import { PortalClient } from "@/components/portal/PortalClient";
import {
  buildOrgVorgangFilterCounts,
  ORG_VORGANG_FILTER_LABELS,
  type OrgVorgangFilter,
} from "@/lib/org/org-vorgang-filter";
import type { OrgPartnerBefundEntry } from "@/lib/org/load-partner-befund";
import type { OrganisationKunde, OrganisationLead, OrganisationObjekt } from "@/lib/org/types";
import { buildKundeVorgaenge } from "@/lib/portal/build-kunde-vorgaenge";
import type { KundeVorgangFilter } from "@/lib/portal/kunde-vorgang-filter";
import { cn } from "@/lib/utils";

type AngebotRow = Parameters<typeof OrganisationFreigabePanel>[0]["angebote"][number];

type Props = {
  kunde: OrganisationKunde;
  eingang: OrganisationLead[];
  objekte: OrganisationObjekt[];
  leads: OrganisationLead[];
  angebote: AngebotRow[];
  auftraege: Parameters<typeof PortalClient>[0]["auftraege"];
  initialFilter?: OrgVorgangFilter | null;
  initialSelectedId?: string | null;
  onRefresh: () => void;
  onFilterChange?: (filter: OrgVorgangFilter) => void;
  partnerBefundByLeadId?: Record<string, OrgPartnerBefundEntry[]>;
};

function OrgVorgangFilterBar({
  filter,
  onFilterChange,
  counts,
}: {
  filter: OrgVorgangFilter;
  onFilterChange: (filter: OrgVorgangFilter) => void;
  counts: Record<OrgVorgangFilter, number>;
}) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-border-default px-3 py-3 sm:px-4">
      {(["freigabe", "aktiv", "erledigt"] as const).map((id) => (
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
          {ORG_VORGANG_FILTER_LABELS[id]}
          <span className="ml-1.5 text-text-tertiary">({counts[id]})</span>
        </button>
      ))}
    </div>
  );
}

export function OrganisationVorgaengeSection({
  kunde,
  eingang,
  objekte,
  leads,
  angebote,
  auftraege,
  initialFilter,
  initialSelectedId,
  onRefresh,
  onFilterChange,
  partnerBefundByLeadId = {},
}: Props) {
  const [filter, setFilter] = useState<OrgVorgangFilter>(initialFilter ?? "freigabe");

  useEffect(() => {
    if (initialFilter) setFilter(initialFilter);
  }, [initialFilter]);

  function changeFilter(next: OrgVorgangFilter) {
    setFilter(next);
    onFilterChange?.(next);
  }

  const vorgaengeItems = useMemo(
    () =>
      buildKundeVorgaenge({
        leads: leads as Parameters<typeof buildKundeVorgaenge>[0]["leads"],
        angebote: angebote as Parameters<typeof buildKundeVorgaenge>[0]["angebote"],
        auftraege,
      }),
    [leads, angebote, auftraege]
  );

  const counts = useMemo(
    () => buildOrgVorgangFilterCounts(eingang, leads, vorgaengeItems),
    [eingang, leads, vorgaengeItems]
  );

  const vorgangFilter: KundeVorgangFilter =
    filter === "erledigt" ? "erledigt" : "aktiv";

  return (
    <div className="space-y-4">
      <article className="card-bordered overflow-hidden">
        <OrgVorgangFilterBar filter={filter} onFilterChange={changeFilter} counts={counts} />
      </article>

      {filter === "freigabe" ? (
        <OrganisationFreigabePanel
          kunde={kunde}
          eingang={eingang}
          objekte={objekte}
          leads={leads}
          angebote={angebote}
          initialSelectedId={initialSelectedId}
          onRefresh={onRefresh}
          embedded
          partnerBefundByLeadId={partnerBefundByLeadId}
        />
      ) : (
        <PortalClient
          layout="embedded"
          activeSection="auftraege"
          showAnlassBadge
          hideFilterBar
          controlledVorgangFilter={vorgangFilter}
          kunde={kunde}
          leads={leads as Parameters<typeof PortalClient>[0]["leads"]}
          angebote={angebote as Parameters<typeof PortalClient>[0]["angebote"]}
          auftraege={auftraege}
        />
      )}
    </div>
  );
}
