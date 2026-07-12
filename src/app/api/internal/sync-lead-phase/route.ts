import { NextResponse } from "next/server";

import {
  syncLeadFromCrm,
  type CrmLeadSyncEvent,
} from "@/lib/vorgang/sync-lead-from-crm";

const VALID_EVENTS = new Set<CrmLeadSyncEvent>([
  "angebot_gesendet",
  "auftrag_beauftragt",
  "auftrag_abnahme",
  "auftrag_abgeschlossen",
  "auftrag_storniert",
]);

function authorize(request: Request): boolean {
  const secret = process.env.PARTNER_INTERNAL_API_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization")?.trim() ?? "";
  return auth === `Bearer ${secret}`;
}

/** CRM → Portal: Lead-Phase synchronisieren (nutzt transition-Semantik). */
export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültiger Body" }, { status: 400 });
  }

  const leadId = String(body.leadId ?? "").trim();
  const event = String(body.event ?? "").trim() as CrmLeadSyncEvent;
  const actorId = body.actorId ? String(body.actorId) : null;
  const skipMieterMail = body.skipMieterMail === true;

  if (!leadId) {
    return NextResponse.json({ ok: false, error: "leadId fehlt" }, { status: 400 });
  }
  if (!VALID_EVENTS.has(event)) {
    return NextResponse.json({ ok: false, error: "event ungültig" }, { status: 400 });
  }

  const result = await syncLeadFromCrm(leadId, event, { actorId, skipMieterMail });
  if (!result.ok) {
    return NextResponse.json(result, { status: 422 });
  }

  return NextResponse.json({ ok: true });
}
