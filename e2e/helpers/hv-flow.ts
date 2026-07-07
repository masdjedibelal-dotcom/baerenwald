import { loadMusterContext } from "../fixtures/muster-context";
import { adminClient, auditEventsFor, leadById } from "./db";

const crmBase = () => process.env.E2E_CRM_BASE_URL?.trim() ?? "";

export async function crmHvAction(
  action: string,
  payload: Record<string, string>
): Promise<{ ok: boolean; message?: string; auftragId?: string }> {
  const base = crmBase();
  if (!base) throw new Error("E2E_CRM_BASE_URL nicht gesetzt");
  const res = await fetch(`${base}/api/dev/hv-action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  const json = (await res.json()) as {
    ok?: boolean;
    message?: string;
    error?: string;
    auftragId?: string;
  };
  if (!res.ok) return { ok: false, message: json.message ?? json.error ?? res.statusText };
  return { ok: json.ok !== false, message: json.message, auftragId: json.auftragId };
}

export async function markLeadNotfall(leadId: string) {
  const admin = adminClient();
  const lead = await leadById(leadId);
  const fd = (lead?.funnel_daten as Record<string, unknown>) ?? {};
  await admin
    .from("leads")
    .update({
      situation: "notfall",
      funnel_daten: { ...fd, melde_kategorie: "notfall", havarie: true },
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId);
}

export async function assertAuditCounts(
  entityType: string,
  entityId: string,
  expected: Record<string, number>
) {
  const events = await auditEventsFor(entityType, entityId);
  for (const [aktion, count] of Object.entries(expected)) {
    const got = events.filter((e) => e.aktion === aktion).length;
    if (got !== count) {
      throw new Error(
        `Audit ${aktion}: erwartet ${count}, got ${got} (gesamt ${events.length} Events)`
      );
    }
  }
}

export async function confirmKostentraegerApi(
  leadId: string,
  kostentraeger: string,
  cookieHeader: string
) {
  const base = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
  const res = await fetch(`${base}/api/org/leads/${leadId}/kostentraeger`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    body: JSON.stringify({ kostentraeger }),
  });
  return res;
}

export function schwelleDirekt(betragNetto: number): boolean {
  const ctx = loadMusterContext();
  return betragNetto <= ctx.schwelleEur;
}
