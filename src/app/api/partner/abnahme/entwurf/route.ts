import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * POST /api/partner/abnahme/entwurf
 * Optional Draft — aktuell No-Op (Dokument erst nach Signatur).
 */
export async function POST() {
  return NextResponse.json({
    ok: true,
    draft: true,
    message: "Entwurf lokal möglich; finales Dokument erst nach Signatur.",
  });
}
