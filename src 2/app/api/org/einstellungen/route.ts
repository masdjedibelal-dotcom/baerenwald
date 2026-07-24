import { NextResponse } from "next/server";

import { writeAuditEvent } from "@/lib/audit/write-audit-event";
import { requireOrgAdminSession } from "@/lib/org/require-org-session";
import type { FreigabeModus } from "@/lib/org/types";
import { supabaseAdmin } from "@/lib/supabase";

type Body = {
  freigabe_modus?: FreigabeModus;
  freigabe_schwelle_eur?: number | null;
  notfall_direkt?: boolean;
  kleinreparatur_aktiv?: boolean;
  kleinreparatur_schwelle_eur?: number;
};

export async function PATCH(req: Request) {
  const session = await requireOrgAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const body = (await req.json()) as Body;
  const patch: Record<string, unknown> = {};

  if (body.freigabe_modus === "direkt" || body.freigabe_modus === "freigabe") {
    patch.freigabe_modus = body.freigabe_modus;
  }
  if (body.freigabe_schwelle_eur !== undefined) {
    patch.freigabe_schwelle_eur =
      body.freigabe_schwelle_eur == null
        ? null
        : Number(body.freigabe_schwelle_eur);
  }
  if (body.notfall_direkt !== undefined) {
    patch.notfall_direkt = Boolean(body.notfall_direkt);
  }
  if (body.kleinreparatur_aktiv !== undefined) {
    patch.kleinreparatur_aktiv = Boolean(body.kleinreparatur_aktiv);
  }
  if (body.kleinreparatur_schwelle_eur !== undefined) {
    const v = Number(body.kleinreparatur_schwelle_eur);
    patch.kleinreparatur_schwelle_eur =
      Number.isFinite(v) && v > 0 ? Math.min(v, 2000) : 200;
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "Keine Änderungen." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("kunden")
    .update(patch)
    .eq("id", session.kunde.id)
    .select(
      "freigabe_modus, freigabe_schwelle_eur, notfall_direkt, kleinreparatur_aktiv, kleinreparatur_schwelle_eur"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeAuditEvent({
    entityType: "kunde",
    entityId: session.kunde.id,
    aktion: "einstellungen_geaendert",
    actorId: session.userId,
    actorRolle: session.rolle,
    kundeId: session.kunde.id,
    payload: patch,
  });

  return NextResponse.json({ ok: true, settings: data });
}
