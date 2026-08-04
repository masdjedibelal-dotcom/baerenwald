import { NextResponse } from "next/server";

import { resolveMeldeKontext } from "@/lib/org/resolve-melde-kontext";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const org = url.searchParams.get("org")?.trim() ?? "";
  const objekt = url.searchParams.get("objekt")?.trim() ?? "";

  if (!org) {
    return NextResponse.json({ error: "org fehlt" }, { status: 400 });
  }

  const resolved = await resolveMeldeKontext(org, objekt || null);
  if (!resolved.ok) {
    return NextResponse.json(
      { error: resolved.message, code: resolved.code },
      { status: resolved.code === "not_found" ? 404 : 403 }
    );
  }

  const { kontext } = resolved;
  return NextResponse.json({
    org: {
      kennung: kontext.org.org_kennung,
      name:
        kontext.org.org_anzeigename?.trim() ||
        kontext.org.name?.trim() ||
        kontext.org.org_kennung,
      logoUrl: kontext.org.org_logo_url,
    },
    objekt: kontext.objekt
      ? {
          titel: kontext.objekt.display.name,
          einheitenHinweis: kontext.objekt.display.we,
          adresse: [
            kontext.objekt.strasse,
            kontext.objekt.hausnummer,
          ]
            .filter(Boolean)
            .join(" "),
          plzOrt: kontext.objekt.display.adr,
          display: kontext.objekt.display,
        }
      : null,
    objekte: kontext.objekte.map((o) => ({
      id: o.id,
      titel: o.display.name,
      melde_slug: o.melde_slug,
      adresseZeile: o.adresseZeile,
      display: o.display,
    })),
  });
}
