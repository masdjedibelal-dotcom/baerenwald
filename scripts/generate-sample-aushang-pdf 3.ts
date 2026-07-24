/**
 * Generiert Aushang-PDF mit dem echten Layout-Generator.
 * Usage: npx tsx scripts/generate-sample-aushang-pdf.ts [out.pdf]
 */
import { readFileSync, writeFileSync } from "fs";
import path from "path";

import { generateMeldeAushangPdf } from "../src/lib/org/generate-melde-aushang-pdf";
import { buildMeldeUrl, generateMeldeQrPng } from "../src/lib/org/melde-url";

async function main() {
  const out =
    process.argv[2] ||
    path.join(
      process.env.HOME || ".",
      "Desktop",
      "Aushang-baerenwald-muenchen-test.pdf"
    );

  const meldeUrl = buildMeldeUrl("hs-bm", "seitzstrasse-15-80538", {
    forPrint: true,
  });
  const qrPngBytes = await generateMeldeQrPng(meldeUrl, 640);

  let heroImageBytes: Uint8Array | null = null;
  try {
    heroImageBytes = new Uint8Array(
      readFileSync(
        path.join(process.cwd(), "public/images/portal/header-hero.jpg")
      )
    );
  } catch {
    /* optional */
  }

  const pdf = await generateMeldeAushangPdf({
    orgName: "Verwaltung BM",
    orgSub: "Verwaltung",
    logoKuerzel: "HB",
    primaryColor: "#22508C",
    primaryColorSoft: "#E8EEF6",
    objektTitel: "WEG Seitzstraße 15",
    objektAdresse: "Seitzstraße 15 · 80538 München",
    meldeUrl,
    qrPngBytes,
    heroImageBytes,
    hvTelefon: "08980955726",
    hvEmail: "info@baerenwald-muenchen.de",
  });

  writeFileSync(out, pdf);
  console.log("meldeUrl", meldeUrl);
  console.log("wrote", out, pdf.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
