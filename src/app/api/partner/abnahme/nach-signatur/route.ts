import { NextResponse } from "next/server";

import { submitPartnerAbnahmeNachSignatur } from "@/app/actions/partner-abnahmeprotokoll";
import type {
  PortalAbnahmeMangel,
  PortalAbnahmePunkt,
} from "@/lib/partner/abnahme-types";

export const runtime = "nodejs";
export const maxDuration = 60;

/** POST /api/partner/abnahme/nach-signatur */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültiger Body." }, { status: 400 });
  }

  const r = await submitPartnerAbnahmeNachSignatur({
    auftragId: String(body.auftragId ?? ""),
    abnahmeDatum: String(body.abnahme_datum ?? body.abnahmeDatum ?? ""),
    ort: String(body.ort ?? ""),
    notizen: (body.notizen as string | null | undefined) ?? null,
    punkte: (Array.isArray(body.punkte) ? body.punkte : []) as PortalAbnahmePunkt[],
    maengel: (Array.isArray(body.maengel)
      ? body.maengel
      : []) as PortalAbnahmeMangel[],
    hwUnterschriftName: String(body.hwUnterschriftName ?? ""),
    kundeUnterschriftName: String(body.kundeUnterschriftName ?? ""),
    hwSignaturPng: (body.hwSignaturPng as string | null | undefined) ?? null,
    kundeSignaturPng: (body.kundeSignaturPng as string | null | undefined) ?? null,
  });

  if (!r.ok) {
    return NextResponse.json({ ok: false, error: r.error }, { status: 400 });
  }
  return NextResponse.json(r);
}
