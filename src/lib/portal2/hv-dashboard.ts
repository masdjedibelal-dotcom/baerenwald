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
import { PORTAL_VAR } from "@/lib/portal2/tokens";

export const HV_DASHBOARD_ROLE_LABEL = "Verwaltung" as const;
export const HV_DASHBOARD_RECENT_TITLE = "Zuletzt" as const;
export const HV_DASHBOARD_RECENT_ALL = "Alle ansehen" as const;
export const HV_DASHBOARD_EMPTY_RECENT = "Noch nichts" as const;

/** Mock HV-Tiles: Label, Farb-Tokens.
 * D3: `filter` = Listen-Chip (`HV_CHIPS` / OrgVorgangFilter).
 * Kacheln = Chip-Labels: Offen · In Arbeit · Erledigt.
 */
export const HV_DASHBOARD_KPI_DEFS = [
  {
    id: "offen" as const,
    label: "Offen",
    chipLabel: "Offen",
    color: "#8A5A06",
    bg: "#fef3c7",
    filter: "offen" as const,
  },
  {
    id: "in_arbeit" as const,
    label: "In Arbeit",
    chipLabel: "In Arbeit",
    color: "#0f766e",
    bg: "#ccfbf1",
    filter: "in_arbeit" as const,
  },
  {
    id: "erledigt" as const,
    label: "Erledigt",
    chipLabel: "Erledigt",
    color: PORTAL_VAR.primary,
    bg: PORTAL_VAR.primarySoft,
    filter: "erledigt" as const,
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
  gesendet_kunde_at?: string | null;
  pdf_url?: string | null;
  created_at?: string | null;
};

/** Angebot terminal abgelehnt/ersetzt/abgelaufen — keine Entscheidung mehr. */
export function isPortalAngebotAbgelehnt(angebot?: {
  status?: string | null;
  status_einfach?: string | null;
} | null): boolean {
  if (!angebot) return false;
  const s = String(angebot.status_einfach ?? angebot.status ?? "")
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_");
  return (
    s === "abgelehnt" ||
    s === "ersetzt" ||
    s === "abgelaufen" ||
    s.includes("abgelehnt")
  );
}

/** Angebot ist für Portal sichtbar (PDF / gesendet / angenommen) — nicht terminal abgelehnt. */
export function isPortalAngebotVorgelegt(angebot?: {
  status?: string | null;
  status_einfach?: string | null;
  gesendet_am?: string | null;
  gesendet_kunde_at?: string | null;
  pdf_url?: string | null;
} | null): boolean {
  if (!angebot) return false;
  if (isPortalAngebotAbgelehnt(angebot)) return false;
  if (angebot.pdf_url?.trim()) return true;
  if (angebot.gesendet_am?.trim() || angebot.gesendet_kunde_at?.trim()) {
    return true;
  }
  const s = String(angebot.status_einfach ?? angebot.status ?? "")
    .toLowerCase()
    .trim();
  return (
    s === "gesendet" ||
    s === "angenommen" ||
    s === "kunde_akzeptiert" ||
    s === "gesendet_kunde" ||
    s === "beauftragt"
  );
}

/** Bevorzugtes Angebot für Flow/Status (gesendet vor Entwurf). */
export function pickPreferredAngebotForPortalFlow<
  T extends {
    status?: string | null;
    status_einfach?: string | null;
    gesendet_am?: string | null;
    gesendet_kunde_at?: string | null;
    pdf_url?: string | null;
    created_at?: string | null;
  },
>(candidates: T[]): T | null {
  if (!candidates.length) return null;
  const rank = (a: T): number => {
    if (isPortalAngebotVorgelegt(a)) {
      const s = String(a.status_einfach ?? a.status ?? "")
        .toLowerCase()
        .trim();
      if (s === "angenommen" || s === "kunde_akzeptiert" || s === "beauftragt") {
        return 0;
      }
      return 1;
    }
    const s = String(a.status_einfach ?? a.status ?? "")
      .toLowerCase()
      .trim();
    // Abgelehntes Kundenangebot (hatte PDF/Zustellung) vor reinem Entwurf
    if (
      (s === "ersetzt" || s === "abgelehnt" || s === "abgelaufen") &&
      Boolean(a.pdf_url?.trim() || a.gesendet_am?.trim() || a.gesendet_kunde_at?.trim())
    ) {
      return 2;
    }
    if (s === "entwurf") return 3;
    if (s === "ersetzt" || s === "abgelehnt" || s === "abgelaufen") return 9;
    return 5;
  };
  return [...candidates].sort((a, b) => {
    const diff = rank(a) - rank(b);
    if (diff !== 0) return diff;
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tb - ta;
  })[0]!;
}

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
    abgelehnt: 0,
  };
}

/** A4-Flow-Status für einen Lead (+ optional Angebot/Auftrag). */
export function resolveLeadPortalFlowStatus(input: {
  lead: HvDashboardLeadSlice;
  angebot?: HvDashboardAngebotSlice | null;
  auftrag?: HvDashboardAuftragSlice | null;
  extra?: PortalFlowExtraSignals;
}): PortalMockStatusId {
  const auftragSt = String(input.auftrag?.status ?? "")
    .toLowerCase()
    .trim();
  const hasAktiverAuftrag =
    Boolean(input.auftrag?.id) &&
    auftragSt !== "storniert" &&
    auftragSt !== "abgelehnt";
  if (
    !hasAktiverAuftrag &&
    isPortalAngebotAbgelehnt(input.angebot)
  ) {
    return "abgelehnt";
  }

  const resolved = resolveVorgang(
    buildPortalResolveInput({
      lead: input.lead,
      angebot: input.angebot ?? null,
      auftrag: input.auftrag ?? null,
    })
  );
  const angebotVorgelegt =
    input.extra?.angebotVorgelegt ?? isPortalAngebotVorgelegt(input.angebot);
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
  const angeboteByLead = new Map<string, HvDashboardAngebotSlice[]>();
  for (const a of input.angebote ?? []) {
    const lid = a.lead_id?.trim();
    if (!lid) continue;
    const list = angeboteByLead.get(lid) ?? [];
    list.push(a);
    angeboteByLead.set(lid, list);
  }
  const angebotByLead = new Map<string, HvDashboardAngebotSlice>();
  for (const [lid, list] of Array.from(angeboteByLead.entries())) {
    const preferred = pickPreferredAngebotForPortalFlow(list);
    if (preferred) angebotByLead.set(lid, preferred);
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
 * - Offen = gemeldet + angebot (HV-Aktion: Meldung / Angebotsfreigabe)
 * - In Arbeit = freigegeben + angefragt + auftrag
 * - Erledigt = abschluss + rechnung + bezahlt + abgelehnt
 */
export function buildHvDashboardKpis(flow: HvFlowCountMap): HvDashboardKpiValues {
  return {
    offen: flow.gemeldet + flow.angebot,
    in_arbeit: flow.freigegeben + flow.angefragt + flow.auftrag,
    erledigt:
      flow.abschluss + flow.rechnung + flow.bezahlt + flow.abgelehnt,
  };
}
