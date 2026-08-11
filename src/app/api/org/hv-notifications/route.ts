import { NextResponse } from "next/server";

import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const LEAD_ID_IN_LINK =
  /[?&]id=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

/** Eigene HV-Aktionen — gehören nicht in die Glocke. */
const SELF_ACTION_TYPS = new Set([
  "meldung_abgelehnt",
  "angebot_eingefordert",
  "angebot_angefragt",
]);

function extractLeadIds(links: Array<string | null | undefined>): string[] {
  const ids = new Set<string>();
  for (const link of links) {
    const m = String(link ?? "").match(LEAD_ID_IN_LINK);
    if (m?.[1]) ids.add(m[1].toLowerCase());
  }
  return Array.from(ids);
}

function leadIdFromLink(link: string | null | undefined): string | null {
  const m = String(link ?? "").match(LEAD_ID_IN_LINK);
  return m?.[1]?.toLowerCase() ?? null;
}

function angebotWirklichGesendet(row: {
  gesendet_am?: string | null;
  gesendet_kunde_at?: string | null;
  status_einfach?: string | null;
  status?: string | null;
  pdf_url?: string | null;
}): boolean {
  if (row.gesendet_am && String(row.gesendet_am).trim()) return true;
  if (row.gesendet_kunde_at && String(row.gesendet_kunde_at).trim()) return true;
  if (row.pdf_url && String(row.pdf_url).trim()) return true;
  const s = `${row.status_einfach ?? ""} ${row.status ?? ""}`.toLowerCase();
  return s.includes("gesendet");
}

/** HV-Benachrichtigungen laden (ungültige Lead-Links bereinigen). */
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
  const leadIds = extractLeadIds(rows.map((r) => r.link));
  const valid = new Set<string>();
  const leadsWithGesendetAngebot = new Set<string>();

  if (leadIds.length) {
    const { data: leads } = await supabaseAdmin
      .from("leads")
      .select("id")
      .in("id", leadIds);
    for (const l of leads ?? []) valid.add(String(l.id).toLowerCase());

    const { data: angebote } = await supabaseAdmin
      .from("angebote")
      .select("lead_id, gesendet_am, gesendet_kunde_at, status_einfach, status, pdf_url")
      .in("lead_id", leadIds);
    for (const a of angebote ?? []) {
      const lid = String(a.lead_id ?? "").toLowerCase();
      if (lid && angebotWirklichGesendet(a)) {
        leadsWithGesendetAngebot.add(lid);
      }
    }

    const stale = rows
      .filter((r) => {
        const typ = String(r.typ ?? "").toLowerCase();
        if (SELF_ACTION_TYPS.has(typ)) return true;
        const lid = leadIdFromLink(r.link);
        if (lid && !valid.has(lid)) return true;
        // „Neues Angebot“ ohne wirklich gesendetes Angebot = Phantom nach Freigabe
        if (
          (typ === "angebot" || /neues\s+angebot/i.test(String(r.titel ?? ""))) &&
          lid &&
          !leadsWithGesendetAngebot.has(lid)
        ) {
          return true;
        }
        return false;
      })
      .map((r) => String(r.id));
    if (stale.length) {
      void supabaseAdmin.from("hv_notifications").delete().in("id", stale);
    }
  }

  const notifications = rows.filter((r) => {
    const typ = String(r.typ ?? "").toLowerCase();
    if (SELF_ACTION_TYPS.has(typ)) return false;
    const lid = leadIdFromLink(r.link);
    if (lid && !valid.has(lid)) return false;
    if (
      (typ === "angebot" || /neues\s+angebot/i.test(String(r.titel ?? ""))) &&
      lid &&
      !leadsWithGesendetAngebot.has(lid)
    ) {
      return false;
    }
    return true;
  });
  const unread = notifications.filter((r) => !r.gelesen_am).length;

  return NextResponse.json({ notifications, unread });
}

/** Als gelesen markieren (einzeln oder alle). */
export async function POST(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const body = (await req.json()) as {
    all?: boolean;
    ids?: string[];
    vorgangId?: string;
  };
  const now = new Date().toISOString();

  if (body.all) {
    await supabaseAdmin
      .from("hv_notifications")
      .update({ gelesen_am: now })
      .eq("kunde_id", session.kunde.id)
      .is("gelesen_am", null);
    return NextResponse.json({ ok: true });
  }

  const vorgangId = body.vorgangId?.trim().replace(/^auftrag:/, "");
  if (vorgangId) {
    const { data: unread } = await supabaseAdmin
      .from("hv_notifications")
      .select("id, link")
      .eq("kunde_id", session.kunde.id)
      .is("gelesen_am", null);

    const ids = (unread ?? [])
      .filter((r) => {
        const link = String(r.link ?? "");
        const m = link.match(LEAD_ID_IN_LINK);
        if (m?.[1]?.toLowerCase() === vorgangId.toLowerCase()) return true;
        return link.includes(`id=${vorgangId}`);
      })
      .map((r) => String(r.id));

    if (!ids.length) return NextResponse.json({ ok: true });

    await supabaseAdmin
      .from("hv_notifications")
      .update({ gelesen_am: now })
      .eq("kunde_id", session.kunde.id)
      .in("id", ids);

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
