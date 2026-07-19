"use client";

import { useEffect, useMemo, useState } from "react";

import { OrganisationFreigabePanel } from "@/components/org/OrganisationFreigabePanel";
import { PortalClient } from "@/components/portal/PortalClient";
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
import type { KundeVorgangFilter } from "@/lib/portal/kunde-vorgang-filter";
import {
  HV_BULK_DELETE_OFFENER_PUNKT,
  HV_CHIPS,
  HV_LISTE_PAGE_EYEBROW,
  HV_LISTE_PAGE_TITLE,
} from "@/lib/portal2/hv-liste";
import { PORTAL_C } from "@/lib/portal2/tokens";

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

/** Mock `pageHead` + `hvChips`. */
function HvListeChrome({
  filter,
  onFilterChange,
  freigabeCount,
}: {
  filter: OrgVorgangFilter;
  onFilterChange: (filter: OrgVorgangFilter) => void;
  freigabeCount: number;
}) {
  return (
    <div>
      <div className="px-1 pt-1 pb-1 sm:px-0">
        <p
          className="mb-1 text-[12px] font-semibold uppercase tracking-wide"
          style={{ color: PORTAL_C.faint }}
        >
          {HV_LISTE_PAGE_EYEBROW}
        </p>
        <h1
          className="text-[25px] font-bold"
          style={{
            color: PORTAL_C.ink,
            fontFamily: "var(--p2-font-head, " + PORTAL_C.head + ")",
          }}
        >
          {HV_LISTE_PAGE_TITLE}
        </h1>
      </div>
      <div className="flex flex-wrap gap-2 py-3.5">
        {HV_CHIPS.map((chip) => {
          const on = filter === chip.id;
          const count = chip.showCount ? freigabeCount : null;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => onFilterChange(chip.id)}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold"
              style={{
                border: `1px solid ${on ? "transparent" : PORTAL_C.line}`,
                background: on ? PORTAL_C.greenDark : "#fff",
                color: on ? "#fff" : PORTAL_C.sub,
              }}
            >
              {chip.label}
              {count != null && count > 0 ? (
                <span
                  className="rounded-full px-1.5 py-px text-[10.5px] font-bold"
                  style={{
                    color: on ? PORTAL_C.greenDark : "#fff",
                    background: on ? "#fff" : PORTAL_C.primary,
                  }}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
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
  initialFilter,
  initialSelectedId,
  onRefresh,
  onFilterChange,
  partnerBefundByLeadId = {},
  bautagebuchByLeadId = {},
  hwErledigtByLeadId = {},
  feedbackBereitByLeadId = {},
  hvFeedbackByLeadId = {},
  auftragKontextByLeadId = {},
  dokumenteByLeadId = {},
  auftragIdByLeadId = {},
  hvAbnahmeByLeadId = {},
}: Props) {
  const [filter, setFilter] = useState<OrgVorgangFilter>(
    initialFilter ?? "freigabe"
  );

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
        hvPortalMode: true,
      }),
    [leads, angebote, auftraege]
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
        leads,
        vorgaengeItems,
        auftragByLeadId
      ),
    [eingang, leads, vorgaengeItems, auftragByLeadId]
  );

  const vorgangFilter: KundeVorgangFilter =
    filter === "erledigt" ? "erledigt" : "aktiv";

  return (
    <div className="space-y-3">
      <HvListeChrome
        filter={filter}
        onFilterChange={changeFilter}
        freigabeCount={counts.freigabe}
      />

      {filter !== "freigabe" ? (
        <p className="px-1 text-[11px]" style={{ color: PORTAL_C.faint }}>
          {HV_BULK_DELETE_OFFENER_PUNKT}
        </p>
      ) : null}

      {filter === "freigabe" ? (
        <OrganisationFreigabePanel
          kunde={kunde}
          eingang={eingang}
          objekte={objekte}
          leads={leads}
          angebote={angebote}
          auftraege={auftraege}
          initialSelectedId={initialSelectedId}
          onRefresh={onRefresh}
          embedded
          partnerBefundByLeadId={partnerBefundByLeadId}
          bautagebuchByLeadId={bautagebuchByLeadId}
          hwErledigtByLeadId={hwErledigtByLeadId}
          feedbackBereitByLeadId={feedbackBereitByLeadId}
          hvFeedbackByLeadId={hvFeedbackByLeadId}
          auftragKontextByLeadId={auftragKontextByLeadId}
          dokumenteByLeadId={dokumenteByLeadId}
          auftragIdByLeadId={auftragIdByLeadId}
          hvAbnahmeByLeadId={hvAbnahmeByLeadId}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[rgba(0,0,0,0.08)] bg-white">
          <PortalClient
            layout="embedded"
            hideFilterBar
            hvPortalMode
            controlledVorgangFilter={vorgangFilter}
            kunde={{
              name: kunde.org_anzeigename ?? kunde.name,
              email: kunde.email,
              freigabe_schwelle_eur: kunde.freigabe_schwelle_eur,
            }}
            leads={leads as Parameters<typeof PortalClient>[0]["leads"]}
            angebote={angebote as Parameters<typeof PortalClient>[0]["angebote"]}
            auftraege={auftraege}
            hwErledigtByLeadId={hwErledigtByLeadId}
            hvFeedbackByLeadId={hvFeedbackByLeadId}
            auftragIdByLeadId={auftragIdByLeadId}
            hvAbnahmeByLeadId={hvAbnahmeByLeadId}
          />
        </div>
      )}
    </div>
  );
}
