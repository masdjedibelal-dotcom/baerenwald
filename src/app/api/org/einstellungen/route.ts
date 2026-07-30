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

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "Keine Änderungen." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("kunden")
    .update(patch)
    .eq("id", session.kunde.id)
    .select(
      "freigabe_modus, freigabe_schwelle_eur, notfall_direkt, kleinreparatur_aktiv"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeAuditEvent({
    entityType: "kunde",
    entityId: session.kunde.id,
    aktion: "org_einstellungen_aktualisiert",
    actorRolle: "kunde",
    payload: patch,
  });

  return NextResponse.json({ ok: true, kunde: data });
}
