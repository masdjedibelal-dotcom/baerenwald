import { logDbError } from '@/lib/errors/log-db-error'
import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

/** Gewährleistungs-Wiedervorlage: Fristen prüfen (Cron). */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || auth !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const in30 = new Date();
  in30.setDate(in30.getDate() + 30);
  const grenze = in30.toISOString().slice(0, 10);

  const {data: faellig, error: __dbErr132_1} = await supabaseAdmin
    .from("gewaehrleistungen")
    .select("id, frist_bis")
    .eq("status", "aktiv")
    .lte("frist_bis", grenze)
    .is("wiedervorlage_am", null);
  if (__dbErr132_1) logDbError('app/api/cron/gewaehrleistung/route:gewaehrleistungen', __dbErr132_1)
  let updated = 0;
  for (const g of faellig ?? []) {
    const { error: __dbErr133_2 } = await supabaseAdmin
      .from("gewaehrleistungen")
      .update({ wiedervorlage_am: g.frist_bis })
      .eq("id", g.id);
    if (__dbErr133_2) logDbError('app/api/cron/gewaehrleistung/route:gewaehrleistungen', __dbErr133_2)
    updated += 1;
  }

  return NextResponse.json({ ok: true, wiedervorlagen: updated });
}
