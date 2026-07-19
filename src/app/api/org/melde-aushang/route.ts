import { NextResponse } from "next/server";

import { generateMeldeAushangPdf } from "@/lib/org/generate-melde-aushang-pdf";
import { buildMeldeQrUrl, buildMeldeUrl } from "@/lib/org/melde-url";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const url = new URL(req.url);
  const objektId = url.searchParams.get("objektId")?.trim() ?? "";

  const org = session.kunde;
  const orgKennung = org.org_kennung?.trim() ?? "";
  if (!orgKennung) {
    return NextResponse.json(
      { error: "Organisations-Kennung fehlt. Bitte Bärenwald kontaktieren." },
      { status: 400 }
    );
  }

  const orgName =
    org.org_anzeigename?.trim() || org.name?.trim() || "Hausverwaltung";

  let meldeUrl = buildMeldeUrl(orgKennung);
  let objektTitel = "Schaden melden — Objekt im Formular wählen";
  let objektAdresse = "";

  if (objektId) {
    const { data: objekt } = await supabaseAdmin
      .from("kunden_objekte")
      .select("id, titel, strasse, hausnummer, plz, ort, melde_slug")
      .eq("id", objektId)
      .eq("kunde_id", org.id)
      .maybeSingle();

    if (!objekt?.melde_slug) {
      return NextResponse.json({ error: "Objekt oder Melde-Link fehlt." }, { status: 404 });
    }

    meldeUrl = buildMeldeUrl(orgKennung, objekt.melde_slug);
    objektTitel = String(objekt.titel);
    objektAdresse = [objekt.strasse, objekt.hausnummer, objekt.plz, objekt.ort]
      .filter(Boolean)
      .join(" ");
  }

  let qrPngBytes: Uint8Array | null = null;
  try {
    const qrRes = await fetch(buildMeldeQrUrl(meldeUrl), { cache: "no-store" });
    if (qrRes.ok) {
      qrPngBytes = new Uint8Array(await qrRes.arrayBuffer());
    }
  } catch {
    qrPngBytes = null;
  }

  const bytes = await generateMeldeAushangPdf({
    orgName,
    objektTitel,
    objektAdresse,
    meldeUrl,
    qrPngBytes,
  });

  const filename = objektId
    ? `Aushang-objekt.pdf`
    : `Aushang-${orgKennung}.pdf`;

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
