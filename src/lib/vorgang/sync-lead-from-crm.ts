import { writeAuditEvent } from "@/lib/audit/write-audit-event";
import { notifyMieterStatusChange } from "@/lib/melde/mieter-status-mail";
import type { VorgangPhase } from "@/lib/vorgang/vorgang-phase";
import { isHvPortalLead } from "@/lib/portal/hv-portal-lead";
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

export { isHvPortalLead } from "@/lib/portal/hv-portal-lead";

async function isOrganisationKundeLead(
  lead: LeadRow & { kunde_id?: string | null }
): Promise<boolean> {
  const kundeId = lead.kunde_id?.trim();
  if (!kundeId) return false;
  const { data: kunde } = await supabaseAdmin
    .from("kunden")
    .select("portal_modus")
    .eq("id", kundeId)
    .maybeSingle();
  return kunde?.portal_modus === "organisation";
}

async function shouldSyncPortalLead(
  lead: LeadRow & { kunde_id?: string | null }
): Promise<boolean> {
  if (isHvPortalLead(lead)) return true;
  return isOrganisationKundeLead(lead);
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
      "id, auftraggeber_kunde_id, kunde_id, anlass, kanal, hv_meldung_status, vorgang_phase"
    )
    .eq("id", leadId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!lead?.id) return { ok: false, error: "Lead nicht gefunden" };
  if (!(await shouldSyncPortalLead(lead as LeadRow & { kunde_id?: string | null }))) {
    return { ok: true };
  }

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
