import { NextResponse } from "next/server";

import { loadPortalAuftraegeByLeadIds } from "@/lib/portal/load-auftraege-by-lead-ids";
import { portalErledigtFromLeadAndAuftrag } from "@/lib/portal/vorgang-erledigt";
import {
  mieterStatusLabel,
  resolveMieterStatusStufe,
  type MieterStatusStufe,
} from "@/lib/vorgang/vorgang-phase";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Live-Status für Mieter-Statuslink (ohne Portal-Login).
 * GET ?token=…
 */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ error: "token fehlt." }, { status: 400 });
  }

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select(
      "id, hv_meldung_status, vorgang_phase, org_freigabe_status, freigabe_bypass_grund, mieter_vor_ort_at, geloescht_am, status"
    )
    .eq("melde_tracking_token", token)
    .maybeSingle();

  if (!lead || (lead as { geloescht_am?: string | null }).geloescht_am) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  const leadId = String(lead.id);
  const { kontextByLeadId, auftragIdByLeadId } =
    await loadPortalAuftraegeByLeadIds([leadId]);
  const auftragKontext = kontextByLeadId[leadId] ?? null;
  const auftragId = auftragIdByLeadId[leadId] ?? null;

  const stufe: MieterStatusStufe = resolveMieterStatusStufe(
    lead,
    auftragKontext
  );
  const erledigt = portalErledigtFromLeadAndAuftrag(lead, auftragKontext);

  const anhaenge: Array<{
    id: string;
    name: string;
    datum?: string;
    href: string;
  }> = [];
  if (erledigt && auftragId) {
    const { data: protokolle } = await supabaseAdmin
      .from("auftrag_abnahmeprotokolle")
      .select("id, abnahme_datum, pdf_url, created_at")
      .eq("auftrag_id", auftragId)
      .order("created_at", { ascending: false });
    for (const p of protokolle ?? []) {
      const href = String((p as { pdf_url?: string }).pdf_url ?? "").trim();
      if (!href) continue;
      anhaenge.push({
        id: String((p as { id: string }).id),
        name: "Abnahmeprotokoll",
        datum:
          (p as { abnahme_datum?: string | null }).abnahme_datum ??
          (p as { created_at?: string | null }).created_at ??
          undefined,
        href,
      });
    }
  }

  return NextResponse.json({
    stufe,
    erledigt,
    statusLabel: mieterStatusLabel(stufe),
    anhaenge,
  });
}
