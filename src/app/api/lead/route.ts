import { NextResponse } from "next/server";

import { type PersistLeadInput, persistLead } from "@/lib/lead/persist-lead";

function verifyLeadApiAuth(req: Request): NextResponse | null {
  const secret = process.env.LEAD_API_SECRET?.trim();
  if (!secret) return null;
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return null;
  return NextResponse.json(
    { ok: false, error: "Unauthorized" },
    { status: 401 }
  );
}

/**
 * POST /api/lead — CRM-Endpoint (externer Server mit `LEAD_API_SECRET` oder lokal).
 * Antwort: `{ ok: true, id: "<uuid>" }` bzw. `{ ok: false, error: "…" }`
 */
export async function POST(req: Request) {
  const unauthorized = verifyLeadApiAuth(req);
  if (unauthorized) return unauthorized;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Ungültiges JSON" },
      { status: 400 }
    );
  }

  const input: PersistLeadInput = {
    name: typeof body.name === "string" ? body.name : "",
    email: typeof body.email === "string" ? body.email : undefined,
    telefon: typeof body.telefon === "string" ? body.telefon : undefined,
    notizen:
      typeof body.notizen === "string"
        ? body.notizen
        : typeof body.nachricht === "string"
          ? body.nachricht
          : undefined,
    nachricht:
      typeof body.nachricht === "string" ? body.nachricht : undefined,
    plz: typeof body.plz === "string" ? body.plz : undefined,
    situation:
      typeof body.situation === "string" ? body.situation : undefined,
    bereiche: Array.isArray(body.bereiche)
      ? (body.bereiche as string[])
      : undefined,
    preis_min: typeof body.preis_min === "number" ? body.preis_min : undefined,
    preis_max: typeof body.preis_max === "number" ? body.preis_max : undefined,
    priceMin: typeof body.priceMin === "number" ? body.priceMin : undefined,
    priceMax: typeof body.priceMax === "number" ? body.priceMax : undefined,
    zeitraum:
      typeof body.zeitraum === "string" ? body.zeitraum : undefined,
    kundentyp:
      typeof body.kundentyp === "string" ? body.kundentyp : undefined,
    kanal: typeof body.kanal === "string" ? body.kanal : undefined,
    funnel_daten: body.funnel_daten,
    funnel_quelle:
      typeof body.funnel_quelle === "string"
        ? body.funnel_quelle
        : undefined,
  };

  const result = await persistLead(input);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.status }
    );
  }

  return NextResponse.json({ ok: true, id: result.id });
}
