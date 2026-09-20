/**
 * Sample Aushang via CRM PDF-Service (O5).
 * Usage: PDF_SERVICE_SECRET=… NEXT_PUBLIC_CRM_URL=… npx tsx scripts/generate-sample-aushang-pdf.ts [out.pdf]
 */
import { writeFileSync } from "fs";
import path from "path";

import { buildMeldeUrl, generateMeldeQrPng } from "../src/lib/org/melde-url";
import { renderPdfViaCrm } from "../src/lib/pdf/render-via-crm";

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

  const pdf = await renderPdfViaCrm("aushang", {
    orgName: "Verwaltung BM",
    orgSub: "Verwaltung",
    primaryColor: "#22508C",
    objektTitel: "WEG Seitzstraße 15",
    objektAdresse: "Seitzstraße 15 · 80538 München",
    meldeUrl,
    qrPngBytes,
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
