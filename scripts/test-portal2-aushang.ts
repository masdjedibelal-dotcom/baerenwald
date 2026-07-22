/**
 * Portal 2.0 — Aushang Texte & Pfade.
 */
import {
  AUSHANG_HERO_BODY,
  AUSHANG_HERO_LINE1,
  AUSHANG_HERO_LINE2,
  AUSHANG_SCAN_LABEL,
  AUSHANG_STEPS,
  AUSHANG_STEPS_TITLE,
  aushangSlug,
  aushangUrl,
  meldeAushangPdfPath,
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
assert("hero line2", AUSHANG_HERO_LINE2 === "einfach scannen.");
assert("hero body kurz", AUSHANG_HERO_BODY.length < 120);
assert("scan label normal case", AUSHANG_SCAN_LABEL === "Mit der Handy-Kamera scannen");
assert("steps title sentence case", AUSHANG_STEPS_TITLE === "So funktioniert's");
assert("3 steps", AUSHANG_STEPS.length === 3);
assert("step 01", AUSHANG_STEPS[0]!.n === "01" && AUSHANG_STEPS[0]!.title === "Scannen");
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

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll portal2-aushang checks passed.");
