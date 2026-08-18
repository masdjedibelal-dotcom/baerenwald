import { NextResponse } from "next/server";

import { ensureOrgKennung } from "@/lib/org/ensure-org-kennung";
import { buildMeldeUrl, generateMeldeQrPng } from "@/lib/org/melde-url";
import {
  ORG_MELDE_LEGAL_REQUIRED_ERROR,
  orgMeldeLegalUrlsReady,
} from "@/lib/org/melde-legal-urls";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * QR-PNG für Melde-Link (objektbezogen oder Org-allgemein).
 * Print/Scan: immer kanonische https-URL.
 */
export async function GET(req: Request) {
  try {
    return await handleMeldeQrGet(req);
  } catch (e) {
    console.error("[melde-qr] 500:", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "QR-Code konnte nicht erzeugt werden.",
      },
      { status: 500 }
    );
  }
}

async function handleMeldeQrGet(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const url = new URL(req.url);
  const objektId = url.searchParams.get("objektId")?.trim() ?? "";
  const sizeRaw = Number(url.searchParams.get("size") ?? "640");
  const sizePx = Number.isFinite(sizeRaw)
    ? Math.min(1024, Math.max(240, Math.round(sizeRaw)))
    : 640;

  const org = session.kunde;
  if (!orgMeldeLegalUrlsReady(org)) {
    return NextResponse.json(
      { error: ORG_MELDE_LEGAL_REQUIRED_ERROR },
      { status: 400 }
    );
  }

  const orgKennung = await ensureOrgKennung(org);
  if (!orgKennung) {
    return NextResponse.json(
      { error: "Melde-Link konnte nicht vorbereitet werden." },
      { status: 500 }
    );
  }

  let meldeUrl = buildMeldeUrl(orgKennung, undefined, { forPrint: true });
  let label = orgKennung;

  if (objektId) {
    const { data: objekt } = await supabaseAdmin
      .from("kunden_objekte")
      .select("id, titel, melde_slug")
      .eq("id", objektId)
      .eq("kunde_id", org.id)
      .maybeSingle();

    if (!objekt?.melde_slug) {
      return NextResponse.json(
        { error: "Objekt oder Melde-Link fehlt." },
        { status: 404 }
      );
    }

    meldeUrl = buildMeldeUrl(orgKennung, objekt.melde_slug, { forPrint: true });
    label = String(objekt.titel ?? objekt.melde_slug);
  }

  const png = await generateMeldeQrPng(meldeUrl, sizePx);
  const safeName = label
    .replace(/[^\w\-äöüÄÖÜß]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
  const filename = `QR-${safeName || "Melde-Link"}.png`;
  const body = Buffer.from(png);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Content-Length": String(body.byteLength),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
