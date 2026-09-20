import { logDbError } from '@/lib/errors/log-db-error'
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

  const { error: __dbErr501_1 } = await supabaseAdmin.from("leads").update(patch).eq("id", leadId);
  if (__dbErr501_1) logDbError('lib/vorgang/vorgang-lifecycle:leads', __dbErr501_1)
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
