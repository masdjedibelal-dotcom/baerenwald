/**
 * Portal 2.0 B10 — Aushang slug/url + PDF-Pfad.
 */
import {
  AUSHANG_HERO_LINE1,
  AUSHANG_HERO_LINE2,
  AUSHANG_STEPS,
  aushangPrintPath,
  aushangSlug,
  aushangUrl,
  meldeAushangPdfPath,
} from "../src/lib/portal2/aushang";
import { qrMatrix, qrSvgMarkup } from "../src/lib/portal2/qr-matrix";

let failed = 0;
function assert(name: string, ok: boolean) {
  if (!ok) {
    failed++;
    console.error(`  ✗ ${name}`);
  } else {
    console.log(`  ✓ ${name}`);
  }
}

console.log("portal2 B10 aushang");

assert("hero line1", AUSHANG_HERO_LINE1 === "Schaden melden.");
assert("hero line2", AUSHANG_HERO_LINE2 === "Einfach scannen.");
assert("3 steps", AUSHANG_STEPS.length === 3);
assert("step 01", AUSHANG_STEPS[0]!.n === "01" && AUSHANG_STEPS[0]!.title === "Scannen");

assert(
  "slug from melde_slug",
  aushangSlug({ melde_slug: "Parkallee 9" }) === "parkallee-9"
);
assert(
  "slug fallback name",
  aushangSlug({ name: "Lindenstr. 24" }).includes("lindenstr")
);

const url = aushangUrl("steiner", { melde_slug: "parkallee-9" });
assert("url contains org", url.includes("/melden/steiner/"));
assert("url contains slug", url.includes("parkallee-9"));

assert(
  "pdf path objekt",
  meldeAushangPdfPath("abc-123") === "/api/org/melde-aushang?objektId=abc-123"
);
assert(
  "print path alias",
  aushangPrintPath("abc-123") === meldeAushangPdfPath("abc-123")
);

const m = qrMatrix("BW|parkallee-9|Test");
assert("matrix 29", m.length === 29 && m[0]!.length === 29);
assert("finder top-left on", m[0]![0] === true);

const svg = qrSvgMarkup("test-seed", 100);
assert("svg has root", svg.includes("<svg") && svg.includes('data-om-raster="true"'));

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll portal2-aushang checks passed.");
