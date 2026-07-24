import { NextResponse } from "next/server";

import { writeAuditEvent } from "@/lib/audit/write-audit-event";
import { ensureVersicherungsakteForLead } from "@/lib/org/ensure-versicherungsakte";
import {
  isKostentraeger,
  KOSTENTRAEGER,
  KOSTENTRAEGER_LABELS,
} from "@/lib/vorgang/kostentraeger";
import { requireOrgFreigabeSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

type Body = { kostentraeger?: string; versicherungs_nr?: string };

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

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select("id, auftraggeber_kunde_id, kostentraeger, kunde_objekt_id")
    .eq("id", id)
    .maybeSingle();

  if (!lead || lead.auftraggeber_kunde_id !== session.kunde.id) {
    return NextResponse.json({ error: "Vorgang nicht gefunden." }, { status: 404 });
  }

  const patch: Record<string, unknown> = {
    kostentraeger: kt,
    kostentraeger_vorgeschlagen: false,
    updated_at: new Date().toISOString(),
  };
  if (kt === "versicherung") {
    if (body.versicherungs_nr?.trim()) {
      patch.versicherungs_nr = body.versicherungs_nr.trim();
    } else if (lead.kunde_objekt_id) {
      const { data: obj } = await supabaseAdmin
        .from("kunden_objekte")
        .select("versicherungs_nr")
        .eq("id", lead.kunde_objekt_id)
        .maybeSingle();
      if (obj?.versicherungs_nr?.trim()) {
        patch.versicherungs_nr = obj.versicherungs_nr.trim();
      }
    }
  } else {
    patch.versicherungs_nr = null;
  }

  const { error } = await supabaseAdmin.from("leads").update(patch).eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Sync auf verknüpfte Aufträge
  const auftragPatch: Record<string, unknown> = { kostentraeger: kt };
  if (kt === "versicherung" && body.versicherungs_nr?.trim()) {
    auftragPatch.versicherungs_nr = body.versicherungs_nr.trim();
  }
  await supabaseAdmin.from("auftraege").update(auftragPatch).eq("lead_id", id);

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
    await ensureVersicherungsakteForLead(id, {
      actorId: session.userId,
      actorRolle: session.rolle,
    });
  }

  return NextResponse.json({ ok: true, kostentraeger: kt });
}
