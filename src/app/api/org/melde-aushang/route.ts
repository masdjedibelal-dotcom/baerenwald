import { logDbError } from '@/lib/errors/log-db-error'
import { NextResponse } from "next/server";

import { SITE_CONFIG } from "@/lib/config";
import { ensureOrgKennung } from "@/lib/org/ensure-org-kennung";
import {
  ORG_MELDE_LEGAL_REQUIRED_ERROR,
  orgMeldeLegalUrlsReady,
} from "@/lib/org/melde-legal-urls";
import { buildMeldeUrl, generateMeldeQrPng } from "@/lib/org/melde-url";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { PDF_UI_ERROR, renderPdfViaCrm } from "@/lib/pdf/render-via-crm";
import { orgBrandFromKunde } from "@/lib/portal2/brand-presets";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Individualisierter Aushang-PDF — Auth im Portal, Render im CRM (O5 HTML).
 */
export async function GET(req: Request) {
  try {
    return await handleMeldeAushangGet(req);
  } catch (e) {
    console.error("[melde-aushang] 500:", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error && e.message === PDF_UI_ERROR
            ? PDF_UI_ERROR
            : e instanceof Error
              ? e.message
              : "Aushang konnte nicht erzeugt werden.",
      },
      { status: 500 }
    );
  }
}

async function handleMeldeAushangGet(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const url = new URL(req.url);
  const objektId = url.searchParams.get("objektId")?.trim() ?? "";

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

  const brand = orgBrandFromKunde(org);

  // QR/Print immer kanonische Produktions-URL — nie Preview/localhost
  let meldeUrl = buildMeldeUrl(orgKennung, undefined, { forPrint: true });
  let objektTitel = "";
  let objektAdresse = "";

  if (objektId) {
    const {data: objekt, error: __dbErr190_1} = await supabaseAdmin
      .from("kunden_objekte")
      .select("id, titel, strasse, hausnummer, plz, ort, melde_slug")
      .eq("id", objektId)
      .eq("kunde_id", org.id)
      .maybeSingle();
    if (__dbErr190_1) logDbError('app/api/org/melde-aushang/route:kunden_objekte', __dbErr190_1)
    if (!objekt?.melde_slug) {
      return NextResponse.json(
        { error: "Objekt oder Melde-Link fehlt." },
        { status: 404 }
      );
    }

    meldeUrl = buildMeldeUrl(orgKennung, objekt.melde_slug, { forPrint: true });
    objektTitel = String(objekt.titel ?? "");
    objektAdresse = [objekt.strasse, objekt.hausnummer, objekt.plz, objekt.ort]
      .filter(Boolean)
      .join(" · ");
  }

  let qrPngBytes: Uint8Array | null = null;
  try {
    qrPngBytes = await generateMeldeQrPng(meldeUrl, 640);
  } catch (e) {
    console.error("[melde-aushang] QR-Generierung fehlgeschlagen", e);
    qrPngBytes = null;
  }

  const hvTelefon =
    org.mieter_kontakt_telefon?.trim() ||
    brand.tel ||
    SITE_CONFIG.phone;
  const hvEmail =
    org.mieter_kontakt_email?.trim() ||
    brand.mail ||
    SITE_CONFIG.email;

  const logoUrl = (org.org_logo_url ?? brand.logoUrl)?.trim() || null;

  const bytes = await renderPdfViaCrm("aushang", {
    orgName: brand.name,
    orgSub: brand.sub,
    primaryColor: brand.primary,
    objektTitel: objektTitel || undefined,
    objektAdresse: objektAdresse || undefined,
    meldeUrl,
    qrPngBytes,
    logoUrl,
    hvTelefon,
    hvEmail,
  });

  const safeName = (objektTitel || orgKennung)
    .replace(/[^\w\-äöüÄÖÜß]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
  const filename = `Aushang-${safeName || "HV"}.pdf`;
  const body = Buffer.from(bytes);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Content-Length": String(body.byteLength),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
