import { NextResponse } from "next/server";

import { bestaetigePartnerAbnahme } from "@/app/actions/partner-abnahmeprotokoll";

export const runtime = "nodejs";

/** POST /api/partner/abnahme/bestaetigen */
export async function POST(req: Request) {
  let body: { auftragId?: string; protokollId?: string | null };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültiger Body." }, { status: 400 });
  }
  const r = await bestaetigePartnerAbnahme(
    String(body.auftragId ?? ""),
    body.protokollId ?? null
  );
  if (!r.ok) {
    return NextResponse.json({ ok: false, error: r.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
