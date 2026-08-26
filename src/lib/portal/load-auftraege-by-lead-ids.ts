import type { PortalAuftragKontext } from "@/lib/portal/vorgang-erledigt";
import { handwerkerFirmenLabel } from "@/lib/portal2/handwerker-display";
import { supabaseAdmin } from "@/lib/supabase";

export type PortalAuftragByLeadSnapshot = PortalAuftragKontext & {
  id: string;
  lead_id: string;
  titel?: string | null;
  created_at?: string | null;
  start_datum?: string | null;
  end_datum?: string | null;
  /** Zugewiesene Handwerker-Firma(n), nicht CRM-Betreuer. */
  handwerkerLabel?: string | null;
  handwerkerBestaetigt?: boolean;
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
    .select(
      "id, lead_id, titel, status, fortschritt, start_datum, end_datum, created_at, handwerker_bestaetigt_at"
    )
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
      handwerkerBestaetigt: Boolean(
        (row as { handwerker_bestaetigt_at?: string | null })
          .handwerker_bestaetigt_at
      ),
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

    const handwerkerIds = Array.from(
      new Set(
        (positionen ?? [])
          .map((p) =>
            String((p as { handwerker_id?: string | null }).handwerker_id ?? "").trim()
          )
          .filter(Boolean)
      )
    );
    const handwerkerLabelById = new Map<string, string>();
    if (handwerkerIds.length > 0) {
      const { data: hwRows } = await supabaseAdmin
        .from("handwerker")
        .select("id, firma, name")
        .in("id", handwerkerIds);
      for (const row of hwRows ?? []) {
        const id = String((row as { id: string }).id);
        const label = handwerkerFirmenLabel({
          firma: (row as { firma?: string | null }).firma,
          name: (row as { name?: string | null }).name,
        });
        if (label) handwerkerLabelById.set(id, label);
      }
    }

    for (const auftrag of Array.from(latestByLead.values())) {
      const labels: string[] = [];
      const seen = new Set<string>();
      for (const p of auftrag.positionen ?? []) {
        const hid = String(p.handwerker_id ?? "").trim();
        if (!hid) continue;
        const label = handwerkerLabelById.get(hid);
        if (!label || seen.has(label)) continue;
        seen.add(label);
        labels.push(label);
      }
      auftrag.handwerkerLabel = labels.length ? labels.join(" · ") : null;
    }
  }

  const auftraege = Array.from(latestByLead.values());
  const auftragIdsAll = auftraege.map((a) => a.id);

  const hasBautagebuch = new Set<string>();
  const hwGesendet = new Set<string>();
  const hwBestaetigt = new Set<string>();
  const hasOffeneMaengel = new Set<string>();

  if (auftragIdsAll.length) {
    const [{ data: btRows }, { data: ahRows }, { data: protoRows }] =
      await Promise.all([
        supabaseAdmin
          .from("auftrag_bautagebuch_eintraege")
          .select("auftrag_id")
          .in("auftrag_id", auftragIdsAll)
          .limit(500),
        supabaseAdmin
          .from("auftrag_handwerker")
          .select("auftrag_id, status")
          .in("auftrag_id", auftragIdsAll),
        supabaseAdmin
          .from("auftrag_abnahmeprotokolle")
          .select("auftrag_id, maengel")
          .in("auftrag_id", auftragIdsAll)
          .order("created_at", { ascending: false }),
      ]);

    for (const r of btRows ?? []) {
      hasBautagebuch.add(String((r as { auftrag_id: string }).auftrag_id));
    }
    for (const r of ahRows ?? []) {
      const aid = String((r as { auftrag_id: string }).auftrag_id);
      const st = String((r as { status?: string }).status ?? "").toLowerCase();
      if (st === "ersetzt") continue;
      hwGesendet.add(aid);
      if (st === "akzeptiert" || st === "zugewiesen" || st === "angenommen") {
        hwBestaetigt.add(aid);
      }
    }
    const seenProto = new Set<string>();
    for (const r of protoRows ?? []) {
      const aid = String((r as { auftrag_id: string }).auftrag_id);
      if (seenProto.has(aid)) continue;
      seenProto.add(aid);
      const maengel = (r as { maengel?: unknown }).maengel;
      if (!Array.isArray(maengel)) continue;
      const offen = maengel.some((m) => {
        if (!m || typeof m !== "object") return false;
        const s = String((m as { status?: string }).status ?? "offen").toLowerCase();
        return s === "offen" || s === "in_bearbeitung";
      });
      if (offen) hasOffeneMaengel.add(aid);
    }
  }

  const kontextByLeadId: Record<string, PortalAuftragKontext> = {};
  const auftragIdByLeadId: Record<string, string> = {};
  for (const a of auftraege) {
    kontextByLeadId[a.lead_id] = {
      status: a.status,
      fortschritt: a.fortschritt,
      positionen: a.positionen,
      handwerkerBestaetigt:
        Boolean(a.handwerkerBestaetigt) || hwBestaetigt.has(a.id),
      hasBautagebuch: hasBautagebuch.has(a.id),
      hwGesendet: hwGesendet.has(a.id),
      hasOffeneMaengel: hasOffeneMaengel.has(a.id),
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
