import { NextResponse } from "next/server";

import { listPartnerEinsaetze } from "@/app/actions/partner-einsatz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Einsätze des angemeldeten Partners — als GET statt Server-Action laden:
 * Server-Actions laufen in einer Warteschlange; ein gleichzeitiges router.refresh()
 * (z. B. nach Session-Erneuerung) ließ das Laden sonst nie zurückkommen.
 */
export async function GET() {
  const res = await listPartnerEinsaetze();
  if (!res.ok) return NextResponse.json(res, { status: 401 });
  return NextResponse.json(res);
}
