import {
  computeOrgSlaKpis,
  type OrgSlaAngebotRow,
  type OrgSlaAuftragRow,
  type OrgSlaKpis,
  type OrgSlaLeadRow,
  type OrgSlaTimelineRow,
} from "@/lib/org/compute-org-sla-kpis";
import { supabaseAdmin } from "@/lib/supabase";

const LEAD_SELECT =
  "id, created_at, updated_at, status, hv_meldung_status, vorgang_phase, org_freigabe_status, mieter_vor_ort_at, storniert_am, geloescht_am";

export async function loadOrgSlaKpis(
  kundeId: string,
  zeitraumTage = 90
): Promise<OrgSlaKpis> {
  const kid = kundeId.trim();
  const empty = computeOrgSlaKpis({
    zeitraumTage,
    leads: [],
    timelineByLead: new Map(),
    angeboteByLead: new Map(),
    auftragByLead: new Map(),
  });

  if (!kid) return empty;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - zeitraumTage);
  const cutoffIso = cutoff.toISOString();

  let leadsQuery = supabaseAdmin
    .from("leads")
    .select(LEAD_SELECT)
    .eq("auftraggeber_kunde_id", kid)
    .gte("created_at", cutoffIso)
    .order("created_at", { ascending: false });

  let { data: leadRows, error: leadErr } = await leadsQuery.is(
    "geloescht_am",
    null
  );

  if (leadErr && /geloescht_am/i.test(leadErr.message)) {
    const retry = await supabaseAdmin
      .from("leads")
      .select(LEAD_SELECT)
      .eq("auftraggeber_kunde_id", kid)
      .gte("created_at", cutoffIso);
    leadRows = retry.data;
    leadErr = retry.error;
  }

  if (leadErr) {
    console.warn("[loadOrgSlaKpis] leads:", leadErr.message);
    return empty;
  }

  const leads = (leadRows ?? []) as OrgSlaLeadRow[];
  const leadIds = leads.map((l) => l.id).filter(Boolean);
  if (!leadIds.length) {
    return computeOrgSlaKpis({
      zeitraumTage,
      leads: [],
      timelineByLead: new Map(),
      angeboteByLead: new Map(),
      auftragByLead: new Map(),
    });
  }

  const [{ data: timelineRows }, { data: angebotRows }, { data: auftragRows }] =
    await Promise.all([
      supabaseAdmin
        .from("lead_timeline")
        .select("lead_id, typ, titel, created_at")
        .in("lead_id", leadIds)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("angebote")
        .select("lead_id, gesendet_am, gesendet_kunde_at, created_at")
        .in("lead_id", leadIds),
      supabaseAdmin
        .from("auftraege")
        .select("lead_id, status, created_at, updated_at, abnahme_datum")
        .in("lead_id", leadIds),
    ]);

  const timelineByLead = new Map<string, OrgSlaTimelineRow[]>();
  for (const row of timelineRows ?? []) {
    const lid = String(row.lead_id ?? "");
    if (!lid) continue;
    const list = timelineByLead.get(lid) ?? [];
    list.push(row as OrgSlaTimelineRow);
    timelineByLead.set(lid, list);
  }

  const angeboteByLead = new Map<string, OrgSlaAngebotRow[]>();
  for (const row of angebotRows ?? []) {
    const lid = String(row.lead_id ?? "");
    if (!lid) continue;
    const list = angeboteByLead.get(lid) ?? [];
    list.push(row as OrgSlaAngebotRow);
    angeboteByLead.set(lid, list);
  }

  const auftragByLead = new Map<string, OrgSlaAuftragRow>();
  for (const row of auftragRows ?? []) {
    const lid = String(row.lead_id ?? "");
    if (!lid) continue;
    if (!auftragByLead.has(lid)) {
      auftragByLead.set(lid, row as OrgSlaAuftragRow);
    }
  }

  return computeOrgSlaKpis({
    zeitraumTage,
    leads,
    timelineByLead,
    angeboteByLead,
    auftragByLead,
  });
}
