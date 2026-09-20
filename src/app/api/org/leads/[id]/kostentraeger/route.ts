import { logDbError } from '@/lib/errors/log-db-error'
import { NextResponse } from "next/server";

import { writeAuditEvent } from "@/lib/audit/write-audit-event";
import { ensureVersicherungsakteForLead } from "@/lib/org/ensure-versicherungsakte";
import { isVersicherungsakteEligibleLead } from "@/lib/portal/portal-lead-sichtbarkeit";
import {
  isKostentraeger,
  KOSTENTRAEGER,
  KOSTENTRAEGER_LABELS,
} from "@/lib/vorgang/kostentraeger";
import { requireOrgFreigabeSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

type Body = {
  kostentraeger?: string;
  versicherungs_nr?: string;
  schaden_nr?: string | null;
};

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await requireOrgFreigabeSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const { id } = await ctx.params;
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const kt = String(body.kostentraeger ?? "").trim();
  if (!isKostentraeger(kt)) {
    return NextResponse.json(
      { error: `Kostenträger muss einer von ${KOSTENTRAEGER.join(", ")} sein.` },
      { status: 400 }
    );
  }

  const {data: lead, error: __dbErr187_1} = await supabaseAdmin
    .from("leads")
    .select("id, auftraggeber_kunde_id, kostentraeger, kunde_objekt_id, funnel_daten")
    .eq("id", id)
    .maybeSingle();
  if (__dbErr187_1) logDbError('app/api/org/leads/[id]/kostentraeger/route:leads', __dbErr187_1)

  if (!lead || lead.auftraggeber_kunde_id !== session.kunde.id) {
    return NextResponse.json({ error: "Vorgang nicht gefunden." }, { status: 404 });
  }

  if (kt === "versicherung" && !isVersicherungsakteEligibleLead(lead)) {
    return NextResponse.json(
      {
        error:
          "Bei Direkt-Angebot gibt es keine Schadenakte — bitte über eine Meldung erfassen.",
      },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    kostentraeger: kt,
    kostentraeger_vorgeschlagen: false,
    updated_at: now,
  };
  if (kt === "versicherung") {
    if (body.versicherungs_nr?.trim()) {
      patch.versicherungs_nr = body.versicherungs_nr.trim();
      patch.versicherungs_nr_geaendert_am = now;
    } else if (lead.kunde_objekt_id) {
      const {data: obj, error: __dbErr188_2} = await supabaseAdmin
        .from("kunden_objekte")
        .select("versicherungs_nr")
        .eq("id", lead.kunde_objekt_id)
        .maybeSingle();
      if (__dbErr188_2) logDbError('app/api/org/leads/[id]/kostentraeger/route:kunden_objekte', __dbErr188_2)
      if (obj?.versicherungs_nr?.trim()) {
        patch.versicherungs_nr = obj.versicherungs_nr.trim();
      }
    }
    if (body.schaden_nr !== undefined) {
      patch.schaden_nr = body.schaden_nr?.trim() || null;
      patch.schaden_nr_geaendert_am = now;
    }
  } else {
    patch.versicherungs_nr = null;
    patch.schaden_nr = null;
  }

  const { error } = await supabaseAdmin.from("leads").update(patch).eq("id", id);
  if (error) logDbError('app/api/org/leads/[id]/kostentraeger/route:leads', error)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Sync auf verknüpfte Aufträge
  const auftragPatch: Record<string, unknown> = { kostentraeger: kt };
  if (kt === "versicherung" && body.versicherungs_nr?.trim()) {
    auftragPatch.versicherungs_nr = body.versicherungs_nr.trim();
  }
  const { error: __dbErr189_3 } = await supabaseAdmin.from("auftraege").update(auftragPatch).eq("lead_id", id);
  if (__dbErr189_3) logDbError('app/api/org/leads/[id]/kostentraeger/route:auftraege', __dbErr189_3)

  await writeAuditEvent({
    entityType: "lead",
    entityId: id,
    aktion: "kostentraeger_gesetzt",
    actorId: session.userId,
    actorRolle: session.rolle,
    kundeId: session.kunde.id,
    payload: {
      von: lead.kostentraeger,
      nach: kt,
      label: KOSTENTRAEGER_LABELS[kt],
    },
  });

  if (kt === "versicherung") {
    const result = await ensureVersicherungsakteForLead(id, {
      actorId: session.userId,
      actorRolle: session.rolle,
    });
    if (!result.ok) {
      return NextResponse.json(
        {
          ok: true,
          kostentraeger: kt,
          schadenakteWarning: result.message,
        },
        { status: 200 }
      );
    }
  }

  return NextResponse.json({ ok: true, kostentraeger: kt });
}
