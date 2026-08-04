/**
 * Portal 2.0 B6 — docViewer Kind-Erkennung / Titel.
 */
import {
  detectPortalDocKind,
  portalDocBadgeLabel,
  portalDocMetaLine,
  portalDocTitle,
  resolvePortalDocKind,
} from "../src/lib/portal2/doc-viewer";

let failed = 0;
function assert(name: string, ok: boolean) {
  if (!ok) {
    failed++;
    console.error(`  ✗ ${name}`);
  } else {
    console.log(`  ✓ ${name}`);
  }
}

console.log("portal2 B6 doc-viewer");

assert("pdf by ext", detectPortalDocKind("Abnahmeprotokoll.pdf") === "pdf");
assert(
  "pdf by url query",
  detectPortalDocKind("https://cdn.example/x.pdf?token=1") === "pdf"
);
assert("image jpg", detectPortalDocKind("foto-bad.jpg") === "image");
assert("image webp", detectPortalDocKind("/storage/a.webp") === "image");
assert("other docx", detectPortalDocKind("vertrag.docx") === "other");
assert(
  "mime image",
  detectPortalDocKind("blob", "image/png") === "image"
);
assert(
  "mime pdf",
  detectPortalDocKind("blob", "application/pdf") === "pdf"
);

assert(
  "title strips pdf",
  portalDocTitle("Abnahmeprotokoll.pdf") === "Abnahmeprotokoll"
);
assert("badge pdf", portalDocBadgeLabel("pdf") === "PDF");
assert("badge img", portalDocBadgeLabel("image") === "IMG");

assert(
  "meta default pdf",
  portalDocMetaLine({ name: "a.pdf", url: "/a.pdf" }, "pdf") === "PDF"
);
assert(
  "meta custom",
  portalDocMetaLine(
    { name: "a.pdf", url: "/a.pdf", meta: "PDF · 214 KB" },
    "pdf"
  ) === "PDF · 214 KB"
);

assert(
  "resolve kind override",
  resolvePortalDocKind({
    name: "x.bin",
    url: "/x.bin",
    kind: "image",
  }) === "image"
);

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll portal2-doc checks passed.");
