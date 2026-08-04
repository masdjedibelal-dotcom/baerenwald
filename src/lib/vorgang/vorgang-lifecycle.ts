import { writeAuditEvent } from "@/lib/audit/write-audit-event";
import { notifyMieterStatusChange } from "@/lib/melde/mieter-status-mail";
import type { VorgangPhase } from "@/lib/vorgang/vorgang-phase";
import { supabaseAdmin } from "@/lib/supabase";

export type LifecycleAudit = {
  aktion: string;
  actorId?: string | null;
  actorRolle?: string | null;
  kundeId?: string | null;
  payload?: Record<string, unknown>;
};

/** Phase setzen + optional Audit + Mieter-Mail bei Stufe 3/4. */
export async function transitionLeadVorgangPhase(
  leadId: string,
  phase: VorgangPhase,
  audit?: LifecycleAudit
): Promise<void> {
  const patch: Record<string, unknown> = {
    vorgang_phase: phase,
    updated_at: new Date().toISOString(),
  };

  await supabaseAdmin.from("leads").update(patch).eq("id", leadId);

  if (audit) {
    await writeAuditEvent({
      entityType: "lead",
      entityId: leadId,
      aktion: audit.aktion,
      actorId: audit.actorId ?? null,
      actorRolle: audit.actorRolle ?? null,
      kundeId: audit.kundeId ?? null,
      payload: { phase, ...(audit.payload ?? {}) },
    });
  }

  await notifyMieterStatusChange(leadId);
}
