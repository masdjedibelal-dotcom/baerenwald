import { NextResponse } from "next/server";

import { assertOrgObjekt } from "@/lib/org/assert-org-objekt";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const objektId = new URL(req.url).searchParams.get("objektId")?.trim();
  if (!objektId) {
    return NextResponse.json({ error: "objektId fehlt." }, { status: 400 });
  }
  if (!(await assertOrgObjekt(session.kunde.id, objektId))) {
    return NextResponse.json({ error: "Objekt nicht gefunden." }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("objekt_dokumente")
    .select("*")
    .eq("kunde_objekt_id", objektId)
    .eq("status", "aktiv")
    .order("ablauf_datum", { ascending: true, nullsFirst: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ dokumente: data ?? [] });
}

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Dokumente werden über Vorgänge bereitgestellt — Upload durch die Verwaltung ist nicht möglich.",
    },
    { status: 403 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      error:
        "Dokumente werden über Vorgänge bereitgestellt — Löschen durch die Verwaltung ist hier nicht möglich.",
    },
    { status: 403 }
  );
}
