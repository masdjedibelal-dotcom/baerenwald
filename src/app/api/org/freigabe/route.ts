import { NextResponse } from "next/server";

import { notifyCrmOrgPortal } from "@/lib/org/notify-crm-org";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import type { OrgFreigabeStatus } from "@/lib/org/types";
import { supabaseAdmin } from "@/lib/supabase";

type Body = {
  leadId: string;
  aktion: "freigegeben" | "abgelehnt";
  notiz?: string;
  betrag_eur?: number;
};

export async function POST(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const body = (await req.json()) as Body;
  const leadId = String(body.leadId ?? "").trim();
  const aktion = body.aktion;

  if (!leadId || (aktion !== "freigegeben" && aktion !== "abgelehnt")) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const orgId = session.kunde.id;
  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select("id, auftraggeber_kunde_id, kunde_id, org_freigabe_status")
    .eq("id", leadId)
    .maybeSingle();

  if (
    !lead ||
    (lead.auftraggeber_kunde_id !== orgId && lead.kunde_id !== orgId)
  ) {
    return NextResponse.json({ error: "Lead nicht gefunden." }, { status: 404 });
  }

  const status: OrgFreigabeStatus = aktion;

  await supabaseAdmin
    .from("leads")
    .update({ org_freigabe_status: status })
    .eq("id", leadId);

  await supabaseAdmin.from("org_freigabe_log").insert({
    lead_id: leadId,
    auftraggeber_kunde_id: orgId,
    aktion: aktion === "freigegeben" ? "freigegeben" : "abgelehnt",
    betrag_eur: body.betrag_eur ?? null,
    notiz: body.notiz?.trim() || null,
    erstellt_von: "portal",
  });

  void notifyCrmOrgPortal({
    leadId,
    typ: "freigabe_ergebnis",
    aktion,
    notiz: body.notiz,
  });

  return NextResponse.json({ ok: true, status });
}
