/**
 * Portal 2.0 — Aushang Texte & Pfade (Konzept „Details vereinheitlichen“).
 */
import {
  AUSHANG_BADGE,
  AUSHANG_FOOTER_CONTACT,
  AUSHANG_FOOTER_NO_PHONE,
  AUSHANG_HERO_BODY,
  AUSHANG_HERO_LINE1,
  AUSHANG_HERO_LINE2,
  AUSHANG_SCAN_LABEL,
  AUSHANG_STEPS,
  AUSHANG_STEPS_TITLE,
  AUSHANG_TAGLINE,
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
assert("hero body unter 2 Minuten", AUSHANG_HERO_BODY.includes("unter 2 Minuten"));
assert("badge MIETERSERVICE", AUSHANG_BADGE === "MIETERSERVICE");
assert("scan label", AUSHANG_SCAN_LABEL.includes("HANDY"));
assert("steps title", AUSHANG_STEPS_TITLE.includes("FUNKTIONIERT"));
assert("3 steps", AUSHANG_STEPS.length === 3);
assert("step 01", AUSHANG_STEPS[0].n === "01" && AUSHANG_STEPS[0].title === "Scannen");
assert("tagline", AUSHANG_TAGLINE.includes("ZUHAUSE"));
assert("no phone", AUSHANG_FOOTER_NO_PHONE.includes("SMARTPHONE"));
assert("contact", AUSHANG_FOOTER_CONTACT.includes("direkt"));
assert("slug melde", aushangSlug({ melde_slug: "Seitz Str." }) === "seitz-str");
assert(
  "url",
  aushangUrl("hv-demo", { melde_slug: "haus-a" }).includes("/melden/hv-demo/haus-a")
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
