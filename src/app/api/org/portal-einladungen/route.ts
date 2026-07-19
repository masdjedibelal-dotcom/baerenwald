import { NextResponse } from "next/server";

import { assertOrgObjekt, requireOrgWrite } from "@/lib/org/assert-org-objekt";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { createPortalEinladung } from "@/lib/portal2/portal-einladungen-server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * E4 — Einladungs-Token anlegen / listen.
 * Persistenz: portal_einladungen (Migration STOP bis Freigabe).
 */
export async function GET(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const objektId = new URL(req.url).searchParams.get("objektId")?.trim();
  let q = supabaseAdmin
    .from("portal_einladungen")
    .select(
      "id, token, objekt_id, einheit_id, einheit_ref, bewohner_id, status, expires_at, created_at, eingeloest_am"
    )
    .eq("kunde_id", session.kunde.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (objektId) q = q.eq("objekt_id", objektId);

  const { data, error } = await q;
  if (error) {
    const missing = /portal_einladungen|does not exist|relation/i.test(
      error.message ?? ""
    );
    return NextResponse.json(
      {
        error: missing
          ? "Einladungs-Tabelle noch nicht freigegeben (Migration STOP)."
          : error.message,
        einladungen: [],
      },
      { status: missing ? 503 : 500 }
    );
  }

  return NextResponse.json({ einladungen: data ?? [] });
}

type Body = {
  objektId?: string;
  einheitId?: string | null;
  einheitRef?: string | null;
  bewohnerId?: string | null;
};

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
  const objektId = String(body.objektId ?? "").trim();
  if (!objektId) {
    return NextResponse.json({ error: "objektId fehlt." }, { status: 400 });
  }
  if (!(await assertOrgObjekt(session.kunde.id, objektId))) {
    return NextResponse.json({ error: "Objekt nicht gefunden." }, { status: 404 });
  }

  let einheitRef = body.einheitRef?.trim() || null;
  const einheitId = body.einheitId?.trim() || null;

  if (einheitId) {
    const { data: u } = await supabaseAdmin
      .from("objekt_einheiten")
      .select("id, bezeichnung, kunde_objekt_id")
      .eq("id", einheitId)
      .eq("kunde_objekt_id", objektId)
      .maybeSingle();
    if (!u) {
      return NextResponse.json({ error: "Einheit nicht gefunden." }, { status: 404 });
    }
    if (!einheitRef) einheitRef = u.bezeichnung?.trim() || null;
  }

  const created = await createPortalEinladung({
    kundeId: session.kunde.id,
    objektId,
    einheitId,
    einheitRef,
    bewohnerId: body.bewohnerId?.trim() || null,
    createdBy: session.userId,
  });

  if (!created.ok) {
    return NextResponse.json(
      { error: created.error },
      { status: created.code === "migration_stop" ? 503 : 500 }
    );
  }

  return NextResponse.json({
    einladung: created.row,
    url: created.url,
  });
}
