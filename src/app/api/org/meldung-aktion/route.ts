import { logDbError } from '@/lib/errors/log-db-error'
import { NextResponse } from "next/server";

import { notifyCrmOrgPortal } from "@/lib/org/notify-crm-org";
import { notifyHvMieterEvent } from "@/lib/org/notify-hv-mieter-event";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { requireOrgWrite } from "@/lib/org/assert-org-objekt";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

type Aktion =
  | "angebot_einfordern"
  | "direkt_baerenwald"
  | "ablehnen";

type Body = {
  leadId: string;
  aktion: Aktion;
};

/**
 * HV-Aktion auf Meldung:
 * - direkt_baerenwald / angebot_einfordern (neu → angebot_eingefordert)
 * - ablehnen (nur aus neu)
 */
export async function POST(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }
  const write = requireOrgWrite(session);
  if (!write.ok) {
    return NextResponse.json({ error: write.error }, { status: write.status });
  }

  const body = (await req.json()) as Body;
  const leadId = String(body.leadId ?? "").trim();
  const aktion = body.aktion;
  const allowed: Aktion[] = [
    "angebot_einfordern",
    "direkt_baerenwald",
    "ablehnen",
  ];
  if (!leadId || !allowed.includes(aktion)) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const orgId = session.kunde.id;
  const {data: lead, error: __dbErr192_1} = await supabaseAdmin
    .from("leads")
    .select(
      "id, auftraggeber_kunde_id, kunde_objekt_id, hv_meldung_status, anlass, preis_max, preis_unsicher, melder_name, melder_email, funnel_daten, org_freigabe_status, freigabe_bypass_grund"
    )
    .eq("id", leadId)
    .maybeSingle();
  if (__dbErr192_1) logDbError('app/api/org/meldung-aktion/route:leads', __dbErr192_1)
  if (!lead || lead.auftraggeber_kunde_id !== orgId) {
    return NextResponse.json({ error: "Meldung nicht gefunden." }, { status: 404 });
  }
  if (lead.anlass !== "meldung") {
    return NextResponse.json({ error: "Kein Meldungs-Vorgang." }, { status: 400 });
  }

  const hvStatus = (lead.hv_meldung_status ?? "neu").trim().toLowerCase();

  if (aktion === "direkt_baerenwald" || aktion === "angebot_einfordern") {
    if (hvStatus !== "neu") {
      return NextResponse.json(
        { error: "Für diese Meldung ist die Aktion nicht mehr möglich." },
        { status: 409 }
      );
    }

    if (hvStatus === "neu") {
      const { hvFreigabeEntfaellt } = await import("@/lib/org/freigabe-bypass");
      const funnelDa =
        lead.funnel_daten &&
        typeof lead.funnel_daten === "object" &&
        !Array.isArray(lead.funnel_daten)
          ? (lead.funnel_daten as { direktauftrag?: unknown }).direktauftrag ===
            true
          : false;
      if (
        hvFreigabeEntfaellt({
          orgFreigabeStatus: lead.org_freigabe_status,
          bypassGrund: lead.freigabe_bypass_grund,
          funnelDirektauftrag: funnelDa,
          hvMeldungStatus: lead.hv_meldung_status,
          angebotZugestellt: false,
        })
      ) {
        return NextResponse.json(
          { error: "Keine Freigabe notwendig (Akut oder unter Schwelle)." },
          { status: 409 }
        );
      }
    }

    const { error: updErr } = await supabaseAdmin
      .from("leads")
      .update({ hv_meldung_status: "angebot_eingefordert" })
      .eq("id", leadId);
    if (updErr) logDbError('app/api/org/meldung-aktion/route:leads', updErr)
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }


    const crmNotify = await notifyCrmOrgPortal({ leadId, typ: "meldung" });
    if (!crmNotify.ok) {
      console.warn("[meldung-aktion] CRM-Notify:", crmNotify.error, {
        leadId,
        skipped: crmNotify.skipped === true,
      });
    }

    if (aktion === "direkt_baerenwald") {
      try {
        const { notifyHvWirKuemmernUns } = await import(
          "@/lib/org/notify-hv-wir-kuemmern"
        );
        await notifyHvWirKuemmernUns({ leadId });
      } catch (e) {
        console.warn("[meldung-aktion] hv wir-kuemmern:", e);
      }
    }

    return NextResponse.json({ ok: true, status: "angebot_eingefordert" });
  }

  // --- ablehnen (nur aus neu) ------------------------------
  if (hvStatus !== "neu") {
    return NextResponse.json(
      { error: "Für diese Meldung ist die Aktion nicht mehr möglich." },
      { status: 409 }
    );
  }

  const { hvFreigabeEntfaellt } = await import("@/lib/org/freigabe-bypass");
  const funnelDa =
    lead.funnel_daten &&
    typeof lead.funnel_daten === "object" &&
    !Array.isArray(lead.funnel_daten)
      ? (lead.funnel_daten as { direktauftrag?: unknown }).direktauftrag === true
      : false;
  if (
    hvFreigabeEntfaellt({
      orgFreigabeStatus: lead.org_freigabe_status,
      bypassGrund: lead.freigabe_bypass_grund,
      funnelDirektauftrag: funnelDa,
      hvMeldungStatus: lead.hv_meldung_status,
      angebotZugestellt: false,
    })
  ) {
    return NextResponse.json(
      { error: "Keine Freigabe notwendig (Akut oder unter Schwelle)." },
      { status: 409 }
    );
  }

  const status = "abgelehnt";
  const patch: Record<string, string> = {
    hv_meldung_status: status,
    org_freigabe_status: "abgelehnt",
    vorgang_phase: "abgelehnt",
  };

  const { error: updErr } = await supabaseAdmin
    .from("leads")
    .update(patch)
    .eq("id", leadId);
  if (updErr) logDbError('app/api/org/meldung-aktion/route:leads', updErr)
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  {
    try {
      const melder = lead.melder_name ? String(lead.melder_name) : "Mieter";
      await notifyHvMieterEvent({
        leadId,
        typ: "meldung_abgelehnt",
        titel: "Meldung abgelehnt",
        body: `Die Meldung von ${melder} wurde abgelehnt und abgeschlossen. Bitte informieren Sie den Mieter bei Bedarf.`,
      });
    } catch (e) {
      console.warn("[meldung-aktion] notifyHvMieterEvent:", e);
    }

    const crmNotify = await notifyCrmOrgPortal({ leadId, typ: "meldung" });
    if (!crmNotify.ok) {
      console.warn("[meldung-aktion] CRM-Notify:", crmNotify.error, {
        leadId,
        skipped: crmNotify.skipped === true,
      });
    }
  }

  return NextResponse.json({ ok: true, status });
}
