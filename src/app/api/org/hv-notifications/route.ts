import { NextResponse } from "next/server";

import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

/** HV-Benachrichtigungen (S13). */
export async function GET() {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const { data, error } = await supabaseAdmin
    .from("hv_notifications")
    .select("id, typ, titel, body, link, gelesen_am, created_at")
    .eq("kunde_id", session.kunde.id)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const unread = (data ?? []).filter((n) => !n.gelesen_am).length;
  return NextResponse.json({ notifications: data ?? [], unread });
}

export async function PATCH(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const body = (await req.json()) as { ids?: string[]; all?: boolean };
  const now = new Date().toISOString();

  if (body.all) {
    await supabaseAdmin
      .from("hv_notifications")
      .update({ gelesen_am: now })
      .eq("kunde_id", session.kunde.id)
      .is("gelesen_am", null);
    return NextResponse.json({ ok: true });
  }

  const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];
  if (!ids.length) {
    return NextResponse.json({ error: "ids fehlen." }, { status: 400 });
  }

  await supabaseAdmin
    .from("hv_notifications")
    .update({ gelesen_am: now })
    .eq("kunde_id", session.kunde.id)
    .in("id", ids);

  return NextResponse.json({ ok: true });
}
