import { NextResponse } from "next/server";

import { istTeo } from "@/lib/marke";
import { verarbeiteTeoPlaene } from "@/teo/arbeitsplatz/daten/plaene-teo-faellig";

export const dynamic = "force-dynamic";

function authorize(request: Request): boolean {
  const secret = process.env.PARTNER_INTERNAL_API_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization")?.trim() ?? "";
  return auth === `Bearer ${secret}`;
}

/** CRM-Cron → Portal: fällige TEO-Pläne als Vorgang an TEO. */
export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!istTeo) return NextResponse.json({ ok: true, skipped: "nicht-teo" });
  const r = await verarbeiteTeoPlaene();
  return NextResponse.json({ ok: true, ...r });
}
