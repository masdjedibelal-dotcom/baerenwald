import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

/**
 * Portal 2.0 B4 — eigene `portal_notifications` des angemeldeten Users.
 * Fehlende Tabelle (Migration noch nicht applied) → leere Liste, kein 500.
 */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "DB nicht konfiguriert." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("portal_notifications")
    .select(
      "id, typ, titel, body, vorgang_ref, link, gelesen, created_at, icon_bg, icon_fg, icon_glyph"
    )
    .eq("empfaenger_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    // Relation fehlt vor Migration
    if (/portal_notifications|does not exist|schema cache/i.test(error.message)) {
      return NextResponse.json({ notifications: [], unread: 0, pendingMigration: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const unread = rows.filter((n) => !n.gelesen).length;
  return NextResponse.json({ notifications: rows, unread });
}

export async function PATCH(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "DB nicht konfiguriert." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = (await req.json()) as { ids?: string[]; all?: boolean };
  const now = new Date().toISOString();

  if (body.all) {
    const { error } = await supabaseAdmin
      .from("portal_notifications")
      .update({ gelesen: true, gelesen_am: now })
      .eq("empfaenger_user_id", user.id)
      .eq("gelesen", false);

    if (error) {
      if (/portal_notifications|does not exist|schema cache/i.test(error.message)) {
        return NextResponse.json({ ok: true, pendingMigration: true });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];
  if (!ids.length) {
    return NextResponse.json({ error: "ids fehlen." }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("portal_notifications")
    .update({ gelesen: true, gelesen_am: now })
    .eq("empfaenger_user_id", user.id)
    .in("id", ids);

  if (error) {
    if (/portal_notifications|does not exist|schema cache/i.test(error.message)) {
      return NextResponse.json({ ok: true, pendingMigration: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
