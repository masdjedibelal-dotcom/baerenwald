import { resolveMieterStatusStufe } from "@/lib/vorgang/vorgang-phase";
import { portalErledigtFromLeadAndAuftrag } from "@/lib/portal/vorgang-erledigt";
import type { PortalAuftragKontext } from "@/lib/portal/vorgang-erledigt";

export type OrgSlaLeadRow = {
  id: string;
  created_at: string;
  updated_at?: string | null;
  status?: string | null;
  hv_meldung_status?: string | null;
  vorgang_phase?: string | null;
  org_freigabe_status?: string | null;
  mieter_vor_ort_at?: string | null;
  storniert_am?: string | null;
  geloescht_am?: string | null;
};

export type OrgSlaTimelineRow = {
  lead_id: string;
  typ?: string | null;
  titel?: string | null;
  created_at: string;
};

export type OrgSlaAngebotRow = {
  lead_id?: string | null;
  gesendet_am?: string | null;
  gesendet_kunde_at?: string | null;
  created_at?: string | null;
};

export type OrgSlaAuftragRow = {
  lead_id?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  abnahme_datum?: string | null;
};

export type OrgSlaKpis = {
  zeitraumTage: number;
  reaktionszeit: {
    medianStunden: number | null;
    basis: number;
    wenigDaten: boolean;
    leer: boolean;
  };
  erledigungsdauer: {
    medianTage: number | null;
    basis: number;
    wenigDaten: boolean;
    leer: boolean;
  };
};

function parseTs(iso: string | null | undefined): number | null {
  if (!iso?.trim()) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

export function formatTypischDauerStunden(stunden: number): string {
  if (stunden < 24) {
    return `${stunden.toLocaleString("de-DE", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })} h`;
  }
  const tage = stunden / 24;
  return `${tage.toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} Tage`;
}

export function formatTypischDauerTage(tage: number): string {
  return `${tage.toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} Tage`;
}

function isStorniert(lead: OrgSlaLeadRow): boolean {
  const status = (lead.status ?? "").trim().toLowerCase();
  const phase = (lead.vorgang_phase ?? "").trim().toLowerCase();
  const hv = (lead.hv_meldung_status ?? "").trim().toLowerCase();
  if (lead.geloescht_am?.trim() || lead.storniert_am?.trim()) return true;
  return (
    status === "storniert" ||
    status === "abgelehnt" ||
    phase === "abgelehnt" ||
    hv === "abgelehnt"
  );
}

function auftragKontext(
  auftrag: OrgSlaAuftragRow | null | undefined
): PortalAuftragKontext | null {
  if (!auftrag) return null;
  const st = (auftrag.status ?? "").trim().toLowerCase();
  return {
    status: auftrag.status,
    hwGesendet: st === "gesendet" || st === "in_arbeit" || st === "abnahme",
    handwerkerBestaetigt: st === "in_arbeit" || st === "abnahme",
  };
}

function timelineReaktionTs(events: OrgSlaTimelineRow[]): number | null {
  let earliest: number | null = null;
  for (const e of events) {
    const typ = (e.typ ?? "").trim().toLowerCase();
    const titel = (e.titel ?? "").trim().toLowerCase();
    const ts = parseTs(e.created_at);
    if (ts == null) continue;

    const counts =
      typ === "org_freigabe" ||
      typ === "angebot" ||
      typ === "status" ||
      typ === "kontakt" ||
      (typ === "notiz" && /freigabe|bearbeitung|kontakt|angebot/i.test(titel));

    if (!counts) continue;
    if (typ === "org_freigabe" && titel.includes("abgelehnt")) continue;

    if (earliest == null || ts < earliest) earliest = ts;
  }
  return earliest;
}

/** Erster Mieter-sichtbarer Bearbeitungszeitpunkt — HM-Zuweisung allein zählt nicht. */
export function resolveReaktionEndTs(input: {
  lead: OrgSlaLeadRow;
  timeline: OrgSlaTimelineRow[];
  angebote: OrgSlaAngebotRow[];
  auftrag: OrgSlaAuftragRow | null;
}): number | null {
  const { lead, timeline, angebote, auftrag } = input;
  const candidates: number[] = [];

  const tl = timelineReaktionTs(timeline);
  if (tl != null) candidates.push(tl);

  for (const a of angebote) {
    for (const raw of [a.gesendet_am, a.gesendet_kunde_at]) {
      const ts = parseTs(raw);
      if (ts != null) candidates.push(ts);
    }
  }

  if (auftrag) {
    const ts = parseTs(auftrag.created_at);
    if (ts != null) candidates.push(ts);
  }

  const status = (lead.status ?? "").trim().toLowerCase();
  const hv = (lead.hv_meldung_status ?? "").trim().toLowerCase();
  const freigabe = (lead.org_freigabe_status ?? "").trim().toLowerCase();
  const updated = parseTs(lead.updated_at);

  if (
    hv !== "hm_pruefung" &&
    (status === "kontaktiert" ||
      status === "termin" ||
      status === "angebot" ||
      status === "auftrag")
  ) {
    if (updated != null) candidates.push(updated);
  }

  if (freigabe === "freigegeben" && updated != null) {
    candidates.push(updated);
  }

  if (
    hv === "notmassnahme" ||
    hv === "kleinreparatur" ||
    hv === "angebot_eingefordert"
  ) {
    if (updated != null) candidates.push(updated);
  }

  if (!candidates.length) return null;
  return Math.min(...candidates);
}

export function resolveErledigungEndTs(input: {
  lead: OrgSlaLeadRow;
  auftrag: OrgSlaAuftragRow | null;
}): number | null {
  const { lead, auftrag } = input;
  const ctx = auftragKontext(auftrag);
  if (!portalErledigtFromLeadAndAuftrag(lead, ctx)) return null;

  const candidates: number[] = [];
  const abnahme = parseTs(auftrag?.abnahme_datum);
  if (abnahme != null) candidates.push(abnahme);
  const aufUpd = parseTs(auftrag?.updated_at);
  if (aufUpd != null) candidates.push(aufUpd);
  const leadUpd = parseTs(lead.updated_at);
  if (leadUpd != null) candidates.push(leadUpd);

  if (!candidates.length) return null;
  return Math.max(...candidates);
}

export function computeOrgSlaKpis(input: {
  zeitraumTage?: number;
  now?: Date;
  leads: OrgSlaLeadRow[];
  timelineByLead: Map<string, OrgSlaTimelineRow[]>;
  angeboteByLead: Map<string, OrgSlaAngebotRow[]>;
  auftragByLead: Map<string, OrgSlaAuftragRow>;
}): OrgSlaKpis {
  const zeitraumTage = input.zeitraumTage ?? 90;
  const now = input.now ?? new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - zeitraumTage);

  const reaktionStunden: number[] = [];
  const erledigungTage: number[] = [];

  for (const lead of input.leads) {
    if (isStorniert(lead)) continue;

    const created = parseTs(lead.created_at);
    if (created == null || created < cutoff.getTime()) continue;

    const timeline = input.timelineByLead.get(lead.id) ?? [];
    const angebote = input.angeboteByLead.get(lead.id) ?? [];
    const auftrag = input.auftragByLead.get(lead.id) ?? null;
    const ctx = auftragKontext(auftrag);

    const reaktionEnd = resolveReaktionEndTs({
      lead,
      timeline,
      angebote,
      auftrag,
    });
    const stufe = resolveMieterStatusStufe(lead, ctx);

    if (reaktionEnd != null && reaktionEnd > created && stufe !== "eingegangen") {
      reaktionStunden.push((reaktionEnd - created) / (1000 * 60 * 60));
    }

    const erledigtEnd = resolveErledigungEndTs({ lead, auftrag });
    if (erledigtEnd != null && erledigtEnd > created) {
      erledigungTage.push((erledigtEnd - created) / (1000 * 60 * 60 * 24));
    }
  }

  const reaktionMedian = median(reaktionStunden);
  const erledigungMedian = median(erledigungTage);

  return {
    zeitraumTage,
    reaktionszeit: {
      medianStunden: reaktionMedian,
      basis: reaktionStunden.length,
      wenigDaten:
        reaktionStunden.length > 0 && reaktionStunden.length < 5,
      leer: reaktionStunden.length === 0,
    },
    erledigungsdauer: {
      medianTage: erledigungMedian,
      basis: erledigungTage.length,
      wenigDaten: erledigungTage.length > 0 && erledigungTage.length < 5,
      leer: erledigungTage.length === 0,
    },
  };
}
