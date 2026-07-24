import { NextResponse } from "next/server";

import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

const LEAD_ID_IN_LINK =
  /[?&]id=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

/** Lead-IDs aus Notif-Links extrahieren. */
function leadIdsFromLinks(links: Array<string | null | undefined>): string[] {
  const ids = new Set<string>();
  for (const link of links) {
    const m = String(link ?? "").match(LEAD_ID_IN_LINK);
    if (m?.[1]) ids.add(m[1].toLowerCase());
  }
  return Array.from(ids);
}

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

  const rows = data ?? [];
  const linkedLeadIds = leadIdsFromLinks(rows.map((n) => n.link));
  let existingLeadIds = new Set<string>();
  if (linkedLeadIds.length) {
    const { data: leads } = await supabaseAdmin
      .from("leads")
      .select("id")
      .in("id", linkedLeadIds);
    existingLeadIds = new Set(
      (leads ?? []).map((l) => String(l.id).toLowerCase())
    );

    // Geister-Notifs (Vorgang schon gelöscht) aufräumen
    const orphanIds = rows
      .filter((n) => {
        const m = String(n.link ?? "").match(LEAD_ID_IN_LINK);
        if (!m?.[1]) return false;
        return !existingLeadIds.has(m[1].toLowerCase());
      })
      .map((n) => String(n.id));
    if (orphanIds.length) {
      void supabaseAdmin.from("hv_notifications").delete().in("id", orphanIds);
    }
  }

  const notifications = rows.filter((n) => {
    const m = String(n.link ?? "").match(LEAD_ID_IN_LINK);
    if (!m?.[1]) return true;
    return existingLeadIds.has(m[1].toLowerCase());
  });

  const unread = notifications.filter((n) => !n.gelesen_am).length;
  return NextResponse.json({ notifications, unread });
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
