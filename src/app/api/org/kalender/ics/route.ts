import { createHash } from "crypto";

import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

function icsEscape(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function toIcsDate(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/** Tokengesicherter ICS-Feed für Outlook/Google */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token")?.trim();
  if (!token) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");

  const { data: feed } = await supabaseAdmin
    .from("hv_calendar_feeds")
    .select("kunde_id, auth_user_id")
    .eq("token_hash", tokenHash)
    .eq("aktiv", true)
    .maybeSingle();

  if (!feed) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth() + 6, 0).toISOString();

  const { data: events } = await supabaseAdmin
    .from("v_hv_kalender_events")
    .select("*")
    .eq("kunde_id", feed.kunde_id)
    .gte("event_beginn", start)
    .lte("event_beginn", end)
    .order("event_beginn", { ascending: true });

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Baerenwald//HV Portal//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Bärenwald HV",
  ];

  for (const ev of events ?? []) {
    const uid = `${ev.event_typ}-${ev.quelle_id}@baerenwald.de`;
    const dtStart = toIcsDate(String(ev.event_beginn));
    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
      `DTSTART:${dtStart}`,
      `SUMMARY:${icsEscape(String(ev.titel ?? ev.event_typ))}`,
      `DESCRIPTION:${icsEscape(String(ev.event_typ))}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="baerenwald-hv.ics"',
    },
  });
}
