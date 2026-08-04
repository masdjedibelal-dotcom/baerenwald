import type { PortalAuftragKontext } from "@/lib/portal/vorgang-erledigt";
import { supabaseAdmin } from "@/lib/supabase";

export type PortalAuftragByLeadSnapshot = PortalAuftragKontext & {
  id: string;
  lead_id: string;
  titel?: string | null;
  created_at?: string | null;
  start_datum?: string | null;
  end_datum?: string | null;
};

/** Aufträge + Positionen für Meldungs-Leads (HV-Portal). */
export async function loadPortalAuftraegeByLeadIds(
  leadIds: string[]
): Promise<{
  auftraege: PortalAuftragByLeadSnapshot[];
  kontextByLeadId: Record<string, PortalAuftragKontext>;
  auftragIdByLeadId: Record<string, string>;
}> {
  const ids = Array.from(new Set(leadIds.map((id) => id.trim()).filter(Boolean)));
  if (!ids.length) {
    return { auftraege: [], kontextByLeadId: {}, auftragIdByLeadId: {} };
  }

  const { data: rows } = await supabaseAdmin
    .from("auftraege")
    .select("id, lead_id, titel, status, fortschritt, start_datum, end_datum, created_at")
    .in("lead_id", ids)
    .order("created_at", { ascending: false });

  const latestByLead = new Map<string, PortalAuftragByLeadSnapshot>();
  for (const row of rows ?? []) {
    const leadId = String((row as { lead_id: string }).lead_id);
    if (latestByLead.has(leadId)) continue;
    latestByLead.set(leadId, {
      id: String((row as { id: string }).id),
      lead_id: leadId,
      titel: (row as { titel?: string | null }).titel ?? null,
      status: (row as { status?: string | null }).status ?? null,
      fortschritt: (row as { fortschritt?: number | null }).fortschritt ?? null,
      start_datum: (row as { start_datum?: string | null }).start_datum ?? null,
      end_datum: (row as { end_datum?: string | null }).end_datum ?? null,
      created_at: (row as { created_at?: string | null }).created_at ?? null,
      positionen: [],
    });
  }

  const auftragIds = Array.from(latestByLead.values()).map((a) => a.id);
  if (auftragIds.length) {
    const { data: positionen } = await supabaseAdmin
      .from("auftrag_positionen")
      .select(
        "auftrag_id, handwerker_id, handwerker_status, leistung_status, aenderung_typ"
      )
      .in("auftrag_id", auftragIds);

    const posByAuftrag = new Map<string, PortalAuftragByLeadSnapshot["positionen"]>();
    for (const p of positionen ?? []) {
      const aid = String((p as { auftrag_id: string }).auftrag_id);
      const list = posByAuftrag.get(aid) ?? [];
      list.push({
        handwerker_id: (p as { handwerker_id?: string | null }).handwerker_id ?? null,
        handwerker_status:
          (p as { handwerker_status?: string | null }).handwerker_status ?? null,
        leistung_status:
          (p as { leistung_status?: string | null }).leistung_status ?? null,
        aenderung_typ:
          (p as { aenderung_typ?: string | null }).aenderung_typ ?? null,
      });
      posByAuftrag.set(aid, list);
    }

    for (const auftrag of Array.from(latestByLead.values())) {
      auftrag.positionen = posByAuftrag.get(auftrag.id) ?? [];
    }
  }

  const auftraege = Array.from(latestByLead.values());
  const kontextByLeadId: Record<string, PortalAuftragKontext> = {};
  const auftragIdByLeadId: Record<string, string> = {};
  for (const a of auftraege) {
    kontextByLeadId[a.lead_id] = {
      status: a.status,
      fortschritt: a.fortschritt,
      positionen: a.positionen,
    };
    auftragIdByLeadId[a.lead_id] = a.id;
  }

  return { auftraege, kontextByLeadId, auftragIdByLeadId };
}

export function mergePortalAuftraege<T extends { id: string }>(
  primary: T[],
  extra: T[]
): T[] {
  const byId = new Map(primary.map((a) => [a.id, a]));
  for (const a of extra) {
    if (!byId.has(a.id)) byId.set(a.id, a);
  }
  return Array.from(byId.values());
}
