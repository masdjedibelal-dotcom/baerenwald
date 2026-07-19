/**
 * Portal 2.0 D1 — HV Dashboard (`screenDashboard`) KPI-Logik.
 * Labels/Farben 1:1 Mock; Zählungen über A4 `resolvePortalFlowStatus`.
 */

import { resolveVorgang } from "@/lib/crm-vorgang/resolve-vorgang";
import { buildPortalResolveInput } from "@/lib/crm-vorgang/portal-resolve";
import {
  resolvePortalFlowStatus,
  type PortalFlowExtraSignals,
} from "@/lib/portal2/status-mapping";
import type { PortalMockStatusId } from "@/lib/portal2/status";
import { PORTAL_C } from "@/lib/portal2/tokens";

export const HV_DASHBOARD_ROLE_LABEL = "Hausverwaltung" as const;
export const HV_DASHBOARD_RECENT_TITLE = "Zuletzt" as const;
export const HV_DASHBOARD_RECENT_ALL = "Alle ansehen" as const;
export const HV_DASHBOARD_EMPTY_RECENT = "Noch nichts" as const;

/** Mock HV-Tiles: Label, Farb-Tokens. */
export const HV_DASHBOARD_KPI_DEFS = [
  {
    id: "wartet_freigabe" as const,
    label: "Wartet auf Freigabe",
    color: "#8A5A06",
    bg: "#fef3c7",
    filter: "freigabe" as const,
  },
  {
    id: "in_arbeit" as const,
    label: "In Arbeit",
    color: "#0f766e",
    bg: "#ccfbf1",
    filter: "aktiv" as const,
  },
  {
    id: "gesamt_offen" as const,
    label: "Gesamt offen",
    color: PORTAL_C.primary,
    bg: PORTAL_C.primarySoft,
    filter: "aktiv" as const,
  },
] as const;

export type HvDashboardKpiId = (typeof HV_DASHBOARD_KPI_DEFS)[number]["id"];

export type HvDashboardLeadSlice = {
  id: string;
  status?: string | null;
  situation?: string | null;
  funnel_daten?: unknown;
  kanal?: string | null;
  org_freigabe_status?: string | null;
  hv_meldung_status?: string | null;
  kontakt_name?: string | null;
  plz?: string | null;
  bereiche?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
  melder_name?: string | null;
};

export type HvDashboardAngebotSlice = {
  id: string;
  lead_id?: string | null;
  status?: string | null;
  status_einfach?: string | null;
  gesendet_am?: string | null;
  created_at?: string | null;
};

export type HvDashboardAuftragSlice = {
  id: string;
  lead_id?: string | null;
  status?: string | null;
  created_at?: string | null;
  positionen?: Array<{
    handwerker_id?: string | null;
    handwerker_status?: string | null;
  }> | null;
};

export type HvFlowCountMap = Record<PortalMockStatusId, number>;

export function emptyHvFlowCounts(): HvFlowCountMap {
  return {
    gemeldet: 0,
    freigegeben: 0,
    angefragt: 0,
    angebot: 0,
    auftrag: 0,
    abschluss: 0,
    rechnung: 0,
    bezahlt: 0,
  };
}

/** A4-Flow-Status für einen Lead (+ optional Angebot/Auftrag). */
export function resolveLeadPortalFlowStatus(input: {
  lead: HvDashboardLeadSlice;
  angebot?: HvDashboardAngebotSlice | null;
  auftrag?: HvDashboardAuftragSlice | null;
  extra?: PortalFlowExtraSignals;
}): PortalMockStatusId {
  const resolved = resolveVorgang(
    buildPortalResolveInput({
      lead: input.lead,
      angebot: input.angebot ?? null,
      auftrag: input.auftrag ?? null,
    })
  );
  const angebotVorgelegt =
    input.extra?.angebotVorgelegt ??
    Boolean(
      input.angebot &&
        ["gesendet", "angenommen", "kunde_akzeptiert"].includes(
          String(input.angebot.status_einfach ?? input.angebot.status ?? "")
            .toLowerCase()
        )
    );
  const hwAngefragt =
    input.extra?.hwAngefragt ??
    Boolean(
      input.auftrag?.positionen?.some((p) => p.handwerker_id) ||
        String(input.lead.hv_meldung_status ?? "").toLowerCase() ===
          "angebot_eingefordert"
    );

  return resolvePortalFlowStatus({
    resolved,
    extra: {
      org_freigabe_status: input.lead.org_freigabe_status,
      hv_meldung_status: input.lead.hv_meldung_status,
      angebotVorgelegt,
      hwAngefragt,
      ...input.extra,
    },
  });
}

export function countLeadsByPortalFlow(input: {
  leads: HvDashboardLeadSlice[];
  angebote?: HvDashboardAngebotSlice[];
  auftraege?: HvDashboardAuftragSlice[];
}): HvFlowCountMap {
  const angebotByLead = new Map<string, HvDashboardAngebotSlice>();
  for (const a of input.angebote ?? []) {
    const lid = a.lead_id?.trim();
    if (!lid) continue;
    const prev = angebotByLead.get(lid);
    if (!prev) angebotByLead.set(lid, a);
  }
  const auftragByLead = new Map<string, HvDashboardAuftragSlice>();
  for (const a of input.auftraege ?? []) {
    const lid = a.lead_id?.trim();
    if (!lid) continue;
    if (!auftragByLead.has(lid)) auftragByLead.set(lid, a);
  }

  const counts = emptyHvFlowCounts();
  for (const lead of input.leads) {
    const flow = resolveLeadPortalFlowStatus({
      lead,
      angebot: angebotByLead.get(lead.id) ?? null,
      auftrag: auftragByLead.get(lead.id) ?? null,
    });
    counts[flow] += 1;
  }
  return counts;
}

export type HvDashboardKpiValues = Record<HvDashboardKpiId, number>;

/**
 * Mock HV-Tiles aus A4-Counts:
 * - Wartet auf Freigabe = gemeldet
 * - In Arbeit = auftrag + abschluss
 * - Gesamt offen = gemeldet + freigegeben + angefragt + angebot
 */
export function buildHvDashboardKpis(flow: HvFlowCountMap): HvDashboardKpiValues {
  return {
    wartet_freigabe: flow.gemeldet,
    in_arbeit: flow.auftrag + flow.abschluss,
    gesamt_offen:
      flow.gemeldet + flow.freigegeben + flow.angefragt + flow.angebot,
  };
}
