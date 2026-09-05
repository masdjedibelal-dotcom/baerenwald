"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { HvObjektFilterPopover } from "@/components/org/HvObjektFilterPopover";
import { PortalClient } from "@/components/portal/PortalClient";
import {
  PortalListeEyebrow,
  PortalListeFilterChip,
  PortalListeTitle,
} from "@/components/shared/PortalListeChrome";
import { filterOrgLeadsByObjektIds } from "@/lib/org/filter-leads-by-objekt";
import {
  type OrgVorgangFilter,
} from "@/lib/org/org-vorgang-filter";
import type {
  OrganisationKunde,
  OrganisationLead,
  OrganisationObjekt,
} from "@/lib/org/types";
import {
  HV_CHIPS,
  HV_LISTE_PAGE_EYEBROW,
  HV_LISTE_PAGE_TITLE,
} from "@/lib/portal2/hv-liste";

type Props = {
  kunde: OrganisationKunde;
  eingang: OrganisationLead[];
  objekte: OrganisationObjekt[];
  leads: OrganisationLead[];
  angebote: Parameters<typeof PortalClient>[0]["angebote"];
  auftraege: Parameters<typeof PortalClient>[0]["auftraege"];
  initialVorgaenge?: import("@/lib/portal/portal-detail-item").KundePortalDetailItem[];
  initialFilter?: OrgVorgangFilter | null;
  initialSelectedId?: string | null;
  /** Sofortige Detail-ID vom Parent (vor URL-Update). */
  forceDetailId?: string | null;
  onDetailReady?: () => void;
  onRefresh: () => void;
  onFilterChange?: (filter: OrgVorgangFilter) => void;
  /** Vorgang-Detail offen → Parent kann Content volle Breite nutzen. */
  onDetailOpenChange?: (open: boolean) => void;
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

function parseObjektIdsParam(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Mock `pageHead` + `hvChips` + Objekt-Filter. */
function HvListeChrome({
  filter,
  onFilterChange,
  objekte,
  selectedObjektIds,
  onObjektIdsChange,
}: {
  filter: OrgVorgangFilter;
  onFilterChange: (filter: OrgVorgangFilter) => void;
  objekte: OrganisationObjekt[];
  selectedObjektIds: string[];
  onObjektIdsChange: (ids: string[]) => void;
}) {
  return (
    <div>
      <div className="px-1 pt-1 pb-1 sm:px-0">
        <PortalListeEyebrow>{HV_LISTE_PAGE_EYEBROW}</PortalListeEyebrow>
        <PortalListeTitle>{HV_LISTE_PAGE_TITLE}</PortalListeTitle>
      </div>
      <div className="relative z-30 -mx-1 flex items-center gap-2 px-1 py-3.5">
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {HV_CHIPS.map((chip) => (
            <PortalListeFilterChip
              key={chip.id}
              active={chip.id === filter}
              onClick={() => onFilterChange(chip.id)}
            >
              {chip.label}
            </PortalListeFilterChip>
          ))}
        </div>
        <HvObjektFilterPopover
          objekte={objekte.map((o) => ({
            id: o.id,
            titel: o.titel,
          }))}
          selectedIds={selectedObjektIds}
          onChange={onObjektIdsChange}
        />
      </div>
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
  initialVorgaenge,
  initialFilter,
  initialSelectedId: _initialSelectedId,
  forceDetailId = null,
  onDetailReady,
  onRefresh: _onRefresh,
  onFilterChange,
  onDetailOpenChange,
  bautagebuchByLeadId = {},
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
  const [selectedObjektIds, setSelectedObjektIds] = useState<string[]>(() =>
    parseObjektIdsParam(searchParams.get("objekte"))
  );

  useEffect(() => {
    onDetailOpenChange?.(detailOpen);
  }, [detailOpen, onDetailOpenChange]);

  useEffect(() => {
    setFilter(initialFilter ?? "alle");
  }, [initialFilter]);

  function changeFilter(next: OrgVorgangFilter) {
    setFilter(next);
    setDetailOpen(false);
    onFilterChange?.(next);
  }

  function changeObjektIds(ids: string[]) {
    setSelectedObjektIds(ids);
    setDetailOpen(false);
    if (typeof window === "undefined") return;
    const u = new URL(window.location.href);
    if (ids.length === 0 || ids.length >= objekte.length) {
      u.searchParams.delete("objekte");
    } else {
      u.searchParams.set("objekte", ids.join(","));
    }
    window.history.replaceState(null, "", u.toString());
  }

  const allLeads = useMemo(
    () => mergeOrgLeads(leads, eingang),
    [leads, eingang]
  );

  const filteredLeads = useMemo(
    () => filterOrgLeadsByObjektIds(allLeads, objekte, selectedObjektIds),
    [allLeads, objekte, selectedObjektIds]
  );

  const filteredEingang = useMemo(
    () => filterOrgLeadsByObjektIds(eingang, objekte, selectedObjektIds),
    [eingang, objekte, selectedObjektIds]
  );

  return (
    <div className="space-y-3">
      {!detailOpen ? (
        <HvListeChrome
          filter={filter}
          onFilterChange={changeFilter}
          objekte={objekte}
          selectedObjektIds={selectedObjektIds}
          onObjektIdsChange={changeObjektIds}
        />
      ) : null}

      <PortalClient
        layout="embedded"
        hideFilterBar
        hvPortalMode
        controlledHvListeFilter={filter}
        forceDetailId={forceDetailId}
        onDetailReady={onDetailReady}
        onHvDetailOpenChange={setDetailOpen}
        kunde={{
          name: kunde.org_anzeigename ?? kunde.name,
          email: kunde.email,
          freigabe_schwelle_eur: kunde.freigabe_schwelle_eur,
        }}
        leads={filteredLeads as Parameters<typeof PortalClient>[0]["leads"]}
        angebote={angebote}
        auftraege={auftraege}
        initialVorgaenge={initialVorgaenge}
        bautagebuchByLeadId={bautagebuchByLeadId}
        hwErledigtByLeadId={hwErledigtByLeadId}
        hvFeedbackByLeadId={hvFeedbackByLeadId}
        auftragIdByLeadId={auftragIdByLeadId}
        hvAbnahmeByLeadId={hvAbnahmeByLeadId}
      />
    </div>
  );
}
