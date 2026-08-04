import { createHash, randomBytes } from "crypto";

import { NextResponse } from "next/server";

import { assertOrgObjekt } from "@/lib/org/assert-org-objekt";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

function monthBounds(monat: string) {
  const [y, m] = monat.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0, 23, 59, 59);
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function GET(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const url = new URL(req.url);
  const objektId = url.searchParams.get("objektId")?.trim();
  const monat =
    url.searchParams.get("monat")?.trim() ||
    new Date().toISOString().slice(0, 7);

  if (objektId && !(await assertOrgObjekt(session.kunde.id, objektId))) {
    return NextResponse.json({ error: "Objekt nicht gefunden." }, { status: 404 });
  }

  const { start, end } = monthBounds(monat);

  let q = supabaseAdmin
    .from("v_hv_kalender_events")
    .select("*")
    .eq("kunde_id", session.kunde.id)
    .gte("event_beginn", start)
    .lte("event_beginn", end)
    .order("event_beginn", { ascending: true });

  if (objektId) {
    q = q.eq("kunde_objekt_id", objektId);
  }

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ events: data ?? [], monat });
}

/** ICS-Feed-Token erzeugen oder zurückgeben */
export async function POST() {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const { error } = await supabaseAdmin.from("hv_calendar_feeds").upsert(
    {
      kunde_id: session.kunde.id,
      auth_user_id: session.userId,
      token_hash: tokenHash,
      label: "HV Kalender",
      aktiv: true,
    },
    { onConflict: "kunde_id,auth_user_id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "";
  const icsUrl = `${base}/api/org/kalender/ics?token=${token}`;

  return NextResponse.json({ ok: true, icsUrl, webcalUrl: icsUrl.replace(/^https:/, "webcal:") });
}
