import { NextResponse } from "next/server";

import {
  assertNoDuplicatePruefpflicht,
  normalizeTypInput,
  resolveActorFromSession,
  resolveGewerkIdByName,
} from "@/lib/org/pruefpflichten-helpers";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

type Body = {
  typ?: string;
  typSchluessel?: string;
  typLabel?: string;
  intervallMonate?: number;
  letztePruefung?: string;
  naechsteFaellig?: string;
  notiz?: string;
  status?: string;
};

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const { id } = await ctx.params;
  const body = (await req.json()) as Body;

  const { data: row } = await supabaseAdmin
    .from("objekt_pruefpflichten")
    .select("id, kunde_objekt_id, typ_schluessel")
    .eq("id", id)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: "Eintrag nicht gefunden." }, { status: 404 });
  }

  const { data: objekt } = await supabaseAdmin
    .from("kunden_objekte")
    .select("id")
    .eq("id", row.kunde_objekt_id)
    .eq("kunde_id", session.kunde.id)
    .maybeSingle();

  if (!objekt) {
    return NextResponse.json({ error: "Objekt nicht gefunden." }, { status: 404 });
  }

  const patch: Record<string, unknown> = {};
  const actor = await resolveActorFromSession(session);
  const now = new Date().toISOString();

  if (body.status === "archiviert") {
    patch.status = "archiviert";
  }

  const normalized = normalizeTypInput(body);
  if (normalized) {
    if (
      normalized.typSchluessel &&
      !(await assertNoDuplicatePruefpflicht({
        objektId: String(row.kunde_objekt_id),
        typSchluessel: normalized.typSchluessel,
        excludeId: id,
      }))
    ) {
      return NextResponse.json(
        { error: `${normalized.typ} existiert bereits für dieses Objekt.` },
        { status: 409 }
      );
    }
    patch.typ = normalized.typ;
    patch.typ_schluessel = normalized.typSchluessel;
    patch.gewerk_id = await resolveGewerkIdByName(normalized.gewerkName);
  }

  if (body.intervallMonate !== undefined) {
    patch.intervall_monate = body.intervallMonate ?? null;
  }
  if (body.letztePruefung !== undefined) {
    patch.letzte_pruefung = body.letztePruefung || null;
  }
  if (body.naechsteFaellig !== undefined) {
    patch.naechste_faellig = body.naechsteFaellig || null;
  }
  if (body.notiz !== undefined) {
    patch.notiz = body.notiz?.trim() || null;
  }

  patch.geaendert_am = now;
  patch.geaendert_von_name = actor.name;
  patch.geaendert_von_quelle = actor.quelle;

  const { error } = await supabaseAdmin
    .from("objekt_pruefpflichten")
    .update(patch)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
