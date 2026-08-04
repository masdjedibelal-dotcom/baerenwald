/**
 * Portal 2.0 — Aushang Texte & Pfade.
 */
import {
  AUSHANG_FOOTER_PARTNER,
  AUSHANG_HERO_BODY,
  AUSHANG_HERO_LINE1,
  AUSHANG_HERO_LINE2,
  AUSHANG_SCAN_LABEL,
  AUSHANG_STEPS,
  AUSHANG_STEPS_TITLE,
  aushangSlug,
  aushangUrl,
  meldeAushangPdfPath,
  meldeQrPngPath,
} from "../src/lib/portal2/aushang";

let failed = 0;
function assert(name: string, ok: boolean) {
  if (!ok) {
    failed++;
    console.error(`  ✗ ${name}`);
  } else {
    console.log(`  ✓ ${name}`);
  }
}

console.log("portal2 aushang");

assert("hero line1", AUSHANG_HERO_LINE1 === "Schaden melden,");
assert("hero line2", AUSHANG_HERO_LINE2 === "Status im Blick.");
assert("hero body mieter vorteil", AUSHANG_HERO_BODY.includes("Bestätigung") && AUSHANG_HERO_BODY.includes("Telefon"));
assert("hero body erwachsen", !AUSHANG_HERO_BODY.toLowerCase().includes("kamera hinhalten"));
assert("scan label action", AUSHANG_SCAN_LABEL === "Jetzt melden");
assert("steps title", AUSHANG_STEPS_TITLE === "Ihre Vorteile");
assert("3 steps", AUSHANG_STEPS.length === 3);
assert("step 01", AUSHANG_STEPS[0]!.n === "01" && AUSHANG_STEPS[0]!.title === "Digital");
assert("step 02", AUSHANG_STEPS[1]!.title === "Einfach");
assert("step 03", AUSHANG_STEPS[2]!.title === "Transparent");
assert("step copy ohne belehren", !AUSHANG_STEPS[0]!.detail.toLowerCase().includes("halten sie"));
assert(
  "footer partner hinweis",
  AUSHANG_FOOTER_PARTNER.includes("Partner Bärenwald")
);
assert("slug melde", aushangSlug({ melde_slug: "Seitz Str." }) === "seitz-str");
assert(
  "url",
  aushangUrl("hv-demo", { melde_slug: "haus-a" }).includes("/melden/hv-demo/haus-a")
);
assert(
  "url print canonical",
  aushangUrl("hv-demo", { melde_slug: "haus-a" }, { forPrint: true }).startsWith(
    "https://baerenwaldmuenchen.de/melden/"
  )
);
assert("pdf path org", meldeAushangPdfPath() === "/api/org/melde-aushang");
assert(
  "pdf path objekt",
  meldeAushangPdfPath("abc") === "/api/org/melde-aushang?objektId=abc"
);
assert("qr path org", meldeQrPngPath() === "/api/org/melde-qr");
assert(
  "qr path objekt",
  meldeQrPngPath("abc") === "/api/org/melde-qr?objektId=abc"
);

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll portal2-aushang checks passed.");
