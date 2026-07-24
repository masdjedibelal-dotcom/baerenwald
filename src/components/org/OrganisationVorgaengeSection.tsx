"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { PortalClient } from "@/components/portal/PortalClient";
import {
  PortalListeEyebrow,
  PortalListeFilterChip,
  PortalListeTitle,
} from "@/components/shared/PortalListeChrome";
import {
  buildOrgVorgangFilterCounts,
  buildAuftragByLeadId,
  type OrgVorgangFilter,
} from "@/lib/org/org-vorgang-filter";
import type { OrgPartnerBefundEntry } from "@/lib/org/load-partner-befund";
import type {
  OrganisationKunde,
  OrganisationLead,
  OrganisationObjekt,
} from "@/lib/org/types";
import { buildKundeVorgaenge } from "@/lib/portal/build-kunde-vorgaenge";
import {
  HV_CHIPS,
  HV_LISTE_PAGE_EYEBROW,
  HV_LISTE_PAGE_TITLE,
} from "@/lib/portal2/hv-liste";
import type {
  HvDashboardAngebotSlice,
  HvDashboardAuftragSlice,
} from "@/lib/portal2/hv-dashboard";

type Props = {
  kunde: OrganisationKunde;
  eingang: OrganisationLead[];
  objekte: OrganisationObjekt[];
  leads: OrganisationLead[];
  angebote: Parameters<typeof PortalClient>[0]["angebote"];
  auftraege: Parameters<typeof PortalClient>[0]["auftraege"];
  initialFilter?: OrgVorgangFilter | null;
  initialSelectedId?: string | null;
  onRefresh: () => void;
  onFilterChange?: (filter: OrgVorgangFilter) => void;
  partnerBefundByLeadId?: Record<string, OrgPartnerBefundEntry[]>;
  bautagebuchByLeadId?: Record<
    string,
    Array<{
      id?: string;
      datum?: string;
      created_at?: string;
      titel?: string;
      notiz?: string;
      fotos_urls?: string[];
    }>
  >;
  hwErledigtByLeadId?: Record<string, boolean>;
  feedbackBereitByLeadId?: Record<string, boolean>;
  hvFeedbackByLeadId?: Record<
    string,
    {
      bewertung?: { sterne: number; freitext?: string | null } | null;
      maengel?: Array<{ freitext?: string | null; created_at?: string }>;
    }
  >;
  auftragKontextByLeadId?: Record<
    string,
    import("@/lib/portal/vorgang-erledigt").PortalAuftragKontext
  >;
  dokumenteByLeadId?: Record<
    string,
    Array<{
      id: string;
      name: string;
      subtitle?: string;
      datum?: string;
      href: string;
    }>
  >;
  auftragIdByLeadId?: Record<string, string>;
  hvAbnahmeByLeadId?: Record<
    string,
    {
      art: "ohne_vorbehalt" | "mit_anmerkung" | "zurueckgewiesen";
      anmerkung?: string | null;
      signiert_name: string;
      signiert_am: string;
    }
  >;
};

function mergeOrgLeads(
  leads: OrganisationLead[],
  eingang: OrganisationLead[]
): OrganisationLead[] {
  const byId = new Map<string, OrganisationLead>();
  for (const l of [...leads, ...eingang]) {
    if (l?.id) byId.set(l.id, l);
  }
  return Array.from(byId.values());
}

/** Mock `pageHead` + `hvChips`. */
function HvListeChrome({
  filter,
  onFilterChange,
  offenCount,
}: {
  filter: OrgVorgangFilter;
  onFilterChange: (filter: OrgVorgangFilter) => void;
  offenCount: number;
}) {
  return (
    <div>
      <div className="px-1 pt-1 pb-1 sm:px-0">
        <PortalListeEyebrow>{HV_LISTE_PAGE_EYEBROW}</PortalListeEyebrow>
        <PortalListeTitle>{HV_LISTE_PAGE_TITLE}</PortalListeTitle>
      </div>
      <div className="flex flex-wrap gap-2 py-3.5">
        {HV_CHIPS.map((chip) => {
          const on = filter === chip.id;
          const count = chip.showCount ? offenCount : null;
          return (
            <PortalListeFilterChip
              key={chip.id}
              active={on}
              onClick={() => onFilterChange(chip.id)}
              countBadge={count}
            >
              {chip.label}
            </PortalListeFilterChip>
          );
        })}
      </div>
    </div>
  );
}

export function OrganisationVorgaengeSection({
  kunde,
  eingang,
  objekte: _objekte,
  leads,
  angebote,
  auftraege,
  initialFilter,
  initialSelectedId: _initialSelectedId,
  onRefresh: _onRefresh,
  onFilterChange,
  partnerBefundByLeadId: _partnerBefundByLeadId = {},
  bautagebuchByLeadId: _bautagebuchByLeadId = {},
  hwErledigtByLeadId = {},
  feedbackBereitByLeadId: _feedbackBereitByLeadId = {},
  hvFeedbackByLeadId = {},
  auftragKontextByLeadId: _auftragKontextByLeadId = {},
  dokumenteByLeadId: _dokumenteByLeadId = {},
  auftragIdByLeadId = {},
  hvAbnahmeByLeadId = {},
}: Props) {
  const searchParams = useSearchParams();
  const [detailOpen, setDetailOpen] = useState(() =>
    Boolean(searchParams.get("id")?.trim())
  );
  const [filter, setFilter] = useState<OrgVorgangFilter>(
    initialFilter ?? "alle"
  );

  useEffect(() => {
    if (initialFilter) setFilter(initialFilter);
  }, [initialFilter]);

  function changeFilter(next: OrgVorgangFilter) {
    setFilter(next);
    onFilterChange?.(next);
  }

  const allLeads = useMemo(
    () => mergeOrgLeads(leads, eingang),
    [leads, eingang]
  );

  const vorgaengeItems = useMemo(
    () =>
      buildKundeVorgaenge({
        leads: allLeads as Parameters<typeof buildKundeVorgaenge>[0]["leads"],
        angebote: angebote as Parameters<typeof buildKundeVorgaenge>[0]["angebote"],
        auftraege,
        hvPortalMode: true,
      }),
    [allLeads, angebote, auftraege]
  );

  const auftragByLeadId = useMemo(
    () =>
      buildAuftragByLeadId(
        auftraege as Array<{ id: string; lead_id?: string | null }>
      ),
    [auftraege]
  );

  const counts = useMemo(
    () =>
      buildOrgVorgangFilterCounts(
        eingang,
        allLeads,
        vorgaengeItems,
        auftragByLeadId,
        {
          angebote: angebote as HvDashboardAngebotSlice[],
          auftraege: auftraege as HvDashboardAuftragSlice[],
        }
      ),
    [eingang, allLeads, vorgaengeItems, auftragByLeadId, angebote, auftraege]
  );

  return (
    <div className="space-y-3">
      {!detailOpen ? (
        <HvListeChrome
          filter={filter}
          onFilterChange={changeFilter}
          offenCount={counts.offen}
        />
      ) : null}

      <PortalClient
        layout="embedded"
        hideFilterBar
        hvPortalMode
        controlledHvListeFilter={filter}
        onHvDetailOpenChange={setDetailOpen}
        kunde={{
          name: kunde.org_anzeigename ?? kunde.name,
          email: kunde.email,
          freigabe_schwelle_eur: kunde.freigabe_schwelle_eur,
        }}
        leads={allLeads as Parameters<typeof PortalClient>[0]["leads"]}
        angebote={angebote}
        auftraege={auftraege}
        hwErledigtByLeadId={hwErledigtByLeadId}
        hvFeedbackByLeadId={hvFeedbackByLeadId}
        auftragIdByLeadId={auftragIdByLeadId}
        hvAbnahmeByLeadId={hvAbnahmeByLeadId}
      />
    </div>
  );
}
