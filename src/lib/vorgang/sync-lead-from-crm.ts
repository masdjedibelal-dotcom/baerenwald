import { writeAuditEvent } from "@/lib/audit/write-audit-event";
import { notifyMieterStatusChange } from "@/lib/melde/mieter-status-mail";
import type { VorgangPhase } from "@/lib/vorgang/vorgang-phase";
import { supabaseAdmin } from "@/lib/supabase";

export type CrmLeadSyncEvent =
  | "angebot_gesendet"
  | "auftrag_beauftragt"
  | "auftrag_abnahme"
  | "auftrag_abgeschlossen"
  | "auftrag_storniert";

type LeadRow = {
  id: string;
  auftraggeber_kunde_id: string | null;
  anlass: string | null;
  kanal: string | null;
  hv_meldung_status: string | null;
  vorgang_phase: string | null;
};

const HV_KANALE = new Set([
  "hv_melder_link",
  "hv_direkt",
  "hv_einladung",
  "hv_manuell",
  "hv_katalog",
]);

export function isHvPortalLead(lead: LeadRow): boolean {
  if (lead.auftraggeber_kunde_id) return true;
  if (lead.anlass === "meldung" && lead.kanal && HV_KANALE.has(lead.kanal)) return true;
  return false;
}

function phaseForEvent(event: CrmLeadSyncEvent): VorgangPhase {
  switch (event) {
    case "angebot_gesendet":
      return "in_bearbeitung";
    case "auftrag_beauftragt":
      return "beauftragt";
    case "auftrag_abnahme":
      return "abnahme";
    case "auftrag_abgeschlossen":
      return "abgeschlossen";
    case "auftrag_storniert":
      return "abgelehnt";
  }
}

function hvStatusForEvent(
  event: CrmLeadSyncEvent,
  current: string | null
): string | null {
  if (event === "auftrag_abgeschlossen") return "abgeschlossen";
  if (event === "auftrag_storniert") return "abgelehnt";
  return current;
}

/** CRM → Portal: Lead-Phase und HV-Status synchronisieren (eine Quelle). */
export async function syncLeadFromCrm(
  leadId: string,
  event: CrmLeadSyncEvent,
  opts?: { actorId?: string | null; skipMieterMail?: boolean }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: lead, error } = await supabaseAdmin
    .from("leads")
    .select(
      "id, auftraggeber_kunde_id, anlass, kanal, hv_meldung_status, vorgang_phase"
    )
    .eq("id", leadId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!lead?.id) return { ok: false, error: "Lead nicht gefunden" };
  if (!isHvPortalLead(lead as LeadRow)) return { ok: true };

  const phase = phaseForEvent(event);
  const patch: Record<string, unknown> = {
    vorgang_phase: phase,
    updated_at: new Date().toISOString(),
  };

  const hv = hvStatusForEvent(event, (lead as LeadRow).hv_meldung_status);
  if (hv) patch.hv_meldung_status = hv;

  const { error: upErr } = await supabaseAdmin
    .from("leads")
    .update(patch)
    .eq("id", leadId);

  if (upErr) return { ok: false, error: upErr.message };

  await writeAuditEvent({
    entityType: "lead",
    entityId: leadId,
    aktion: `crm_sync_${event}`,
    actorId: opts?.actorId ?? null,
    actorRolle: "crm",
    kundeId: (lead as LeadRow).auftraggeber_kunde_id ?? null,
    payload: { event, phase, hv_meldung_status: hv },
  });

  if (!opts?.skipMieterMail) {
    try {
      await notifyMieterStatusChange(leadId);
    } catch (e) {
      console.error("[syncLeadFromCrm] mieter-mail", e);
    }
  }

  return { ok: true };
}
