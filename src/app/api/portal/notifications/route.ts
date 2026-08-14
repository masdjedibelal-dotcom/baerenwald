import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { limitReadNotifications } from "@/lib/portal2/notif-types";
import { filterActiveVorgangEntityIds, normalizeVorgangRef } from "@/lib/portal/lead-not-deleted";
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
    .limit(120);

  if (error) {
    // Relation fehlt vor Migration
    if (/portal_notifications|does not exist|schema cache/i.test(error.message)) {
      return NextResponse.json({ notifications: [], unread: 0, pendingMigration: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let rows = data ?? [];

  const notifRefs = rows.flatMap((n) => {
    const fromRef = normalizeVorgangRef(n.vorgang_ref);
    const fromLink = String(n.link ?? "").match(
      /[?&]id=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
    );
    return [fromRef, fromLink?.[1] ?? null].filter(Boolean) as string[];
  });
  if (notifRefs.length) {
    const active = await filterActiveVorgangEntityIds(notifRefs);
    rows = rows.filter((n) => {
      const fromRef = normalizeVorgangRef(n.vorgang_ref);
      const fromLink = String(n.link ?? "").match(
        /[?&]id=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
      )?.[1];
      const ref = fromRef || fromLink || null;
      if (!ref) return true;
      return active.has(ref);
    });
  }

  // Mieter: keine Angebots-Glocken (auch Alt-Einträge ausblenden)
  const angebotRefs = Array.from(
    new Set(
      rows
        .filter((n) => String(n.typ ?? "").toLowerCase() === "angebot")
        .map((n) => String(n.vorgang_ref ?? "").trim())
        .filter(Boolean)
    )
  );
  if (angebotRefs.length) {
    const { data: leads } = await supabaseAdmin
      .from("leads")
      .select("id, auftraggeber_kunde_id")
      .in("id", angebotRefs);
    const mieterLeadIds = new Set(
      (leads ?? [])
        .filter((l) =>
          String(
            (l as { auftraggeber_kunde_id?: string | null }).auftraggeber_kunde_id ??
              ""
          ).trim()
        )
        .map((l) => String((l as { id: string }).id))
    );
    rows = rows.filter((n) => {
      if (String(n.typ ?? "").toLowerCase() !== "angebot") return true;
      const ref = String(n.vorgang_ref ?? "").trim();
      if (ref && mieterLeadIds.has(ref)) return false;
      return true;
    });
  }

  rows = limitReadNotifications(rows, (n) => !n.gelesen);
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

  const body = (await req.json()) as {
    ids?: string[];
    all?: boolean;
    vorgangRef?: string | string[];
  };
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

  const vorgangRefRaw = body.vorgangRef;
  const vorgangRefs = (
    Array.isArray(vorgangRefRaw)
      ? vorgangRefRaw
      : vorgangRefRaw
        ? [vorgangRefRaw]
        : []
  )
    .map((v) => String(v).trim().replace(/^auftrag:/, ""))
    .filter(Boolean);

  if (vorgangRefs.length) {
    const refSet = new Set(vorgangRefs);
    const { data: unread } = await supabaseAdmin
      .from("portal_notifications")
      .select("id, vorgang_ref, link")
      .eq("empfaenger_user_id", user.id)
      .eq("gelesen", false);

    const ids = (unread ?? [])
      .filter((r) => {
        const ref = String(r.vorgang_ref ?? "").trim();
        if (ref && refSet.has(ref)) return true;
        const link = String(r.link ?? "");
        return Array.from(refSet).some((id) => link.includes(`id=${id}`));
      })
      .map((r) => String(r.id));

    if (!ids.length) return NextResponse.json({ ok: true });

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
