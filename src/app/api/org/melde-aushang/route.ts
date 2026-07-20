import { readFile } from "fs/promises";
import path from "path";

import { NextResponse } from "next/server";

import { SITE_CONFIG } from "@/lib/config";
import { generateMeldeAushangPdf } from "@/lib/org/generate-melde-aushang-pdf";
import { buildMeldeQrUrl, buildMeldeUrl } from "@/lib/org/melde-url";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { orgBrandFromKunde } from "@/lib/portal2/brand-presets";
import {
  isPortalDefaultMediaUrl,
  PORTAL_HEADER_HERO_SRC,
} from "@/lib/portal2/portal-media";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

async function fetchImageBytes(url: string | null | undefined): Promise<Uint8Array | null> {
  const u = url?.trim();
  if (!u) return null;
  try {
    const res = await fetch(u, { cache: "no-store" });
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/** Statisches Bild aus /public (Aushang-Hero-Fallback). */
async function loadPublicImageBytes(
  publicPath: string
): Promise<Uint8Array | null> {
  try {
    const rel = publicPath.replace(/^\//, "");
    const abs = path.join(process.cwd(), "public", rel);
    return new Uint8Array(await readFile(abs));
  } catch {
    return null;
  }
}

/**
 * Individualisierter Aushang-PDF (Konzept „Details vereinheitlichen“).
 * Platzhalter aus Org-/Portal-Branding: Name, Farben, Logo, Hero, QR, Melde-URL, Tel, E-Mail.
 */
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

  const brand = orgBrandFromKunde(org);

  let meldeUrl = buildMeldeUrl(orgKennung);
  let objektTitel = "";
  let objektAdresse = "";

  if (objektId) {
    const { data: objekt } = await supabaseAdmin
      .from("kunden_objekte")
      .select("id, titel, strasse, hausnummer, plz, ort, melde_slug")
      .eq("id", objektId)
      .eq("kunde_id", org.id)
      .maybeSingle();

    if (!objekt?.melde_slug) {
      return NextResponse.json(
        { error: "Objekt oder Melde-Link fehlt." },
        { status: 404 }
      );
    }

    meldeUrl = buildMeldeUrl(orgKennung, objekt.melde_slug);
    objektTitel = String(objekt.titel ?? "");
    objektAdresse = [objekt.strasse, objekt.hausnummer, objekt.plz, objekt.ort]
      .filter(Boolean)
      .join(" · ");
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

  const customHero = (org as { org_hero_url?: string | null }).org_hero_url;
  const customHeroUrl =
    customHero?.trim() && !isPortalDefaultMediaUrl(customHero)
      ? customHero.trim()
      : null;

  const [logoImageBytes, customHeroBytes] = await Promise.all([
    fetchImageBytes(org.org_logo_url ?? brand.logoUrl),
    fetchImageBytes(customHeroUrl),
  ]);

  // Eigenes HV-Hero, sonst Portal-Default (Innenhof / Wohnatmosphäre)
  const heroImageBytes =
    customHeroBytes ?? (await loadPublicImageBytes(PORTAL_HEADER_HERO_SRC));

  // Mieter-Kontakt bevorzugt (wie Melde-Flow), sonst Org-/Portal-Fallback
  const hvTelefon =
    org.mieter_kontakt_telefon?.trim() ||
    brand.tel ||
    SITE_CONFIG.phone;
  const hvEmail =
    org.mieter_kontakt_email?.trim() ||
    brand.mail ||
    SITE_CONFIG.email;

  const bytes = await generateMeldeAushangPdf({
    orgName: brand.name,
    orgSub: brand.sub,
    logoKuerzel: brand.logo,
    primaryColor: brand.primary,
    primaryColorSoft: brand.soft,
    objektTitel: objektTitel || undefined,
    objektAdresse: objektAdresse || undefined,
    meldeUrl,
    qrPngBytes,
    logoImageBytes,
    heroImageBytes,
    hvTelefon,
    hvEmail,
  });

  const safeName = (objektTitel || orgKennung)
    .replace(/[^\w\-äöüÄÖÜß]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
  const filename = `Aushang-${safeName || "HV"}.pdf`;

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
