import { NextResponse } from "next/server";

import { logDbError } from "@/lib/errors/log-db-error";
import { istTeo } from "@/lib/marke";
import { meldeStatusPath } from "@/lib/melde/melde-tracking";
import { loadPortalAuftraegeByLeadIds } from "@/lib/portal/load-auftraege-by-lead-ids";
import { portalErledigtFromLeadAndAuftrag } from "@/lib/portal/vorgang-erledigt";
import { checkRateLimit } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Servus TEO — Gewährleistung vom Mieter-Statuslink: „Problem ist wieder da“ (nur bei erledigtem Vorgang).
 * POST { token, text } → neuer Vorgang direkt bei TEO, Antwort mit Statuspfad des neuen Vorgangs.
 */
export async function POST(req: Request) {
  if (!istTeo) return NextResponse.json({ error: "Nicht verfügbar." }, { status: 404 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(ip, 5, 60 * 60 * 1000, "melden_wieder").allowed) {
    return NextResponse.json({ error: "Zu viele Meldungen. Bitte später erneut versuchen." }, { status: 429 });
  }
  const body = (await req.json().catch(() => null)) as { token?: string; text?: string } | null;
  const token = body?.token?.trim();
  const text = (body?.text ?? "").trim().slice(0, 2000);
  if (!token) return NextResponse.json({ error: "token fehlt." }, { status: 400 });

  const { data: lead, error } = await supabaseAdmin
    .from("leads")
    .select("id, hv_meldung_status, vorgang_phase, org_freigabe_status, status, geloescht_am")
    .eq("melde_tracking_token", token)
    .maybeSingle();
  if (error) logDbError("app/api/melden/wieder:lead", error);
  if (!lead || lead.geloescht_am) return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });

  const leadId = String(lead.id);
  const { kontextByLeadId } = await loadPortalAuftraegeByLeadIds([leadId]);
  if (!portalErledigtFromLeadAndAuftrag(lead, kontextByLeadId[leadId] ?? null)) {
    return NextResponse.json({ error: "Das geht erst, wenn der Auftrag erledigt ist." }, { status: 400 });
  }

  const { legeGewaehrleistungAn } = await import("@/teo/hv/gewaehrleistung");
  const r = await legeGewaehrleistungAn(leadId, text, { art: "mieter" });
  if (!r.ok) return NextResponse.json({ error: r.fehler }, { status: 400 });
  return NextResponse.json({ ok: true, statusPfad: r.statusToken ? meldeStatusPath(r.statusToken) : null });
}
