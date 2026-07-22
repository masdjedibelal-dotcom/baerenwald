/**
 * Portal 2.0 B9 — modalEinladen Texte.
 */
import {
  buildPortalEinladenMailto,
  formatPortalEinladenFootnote,
  PORTAL_EINLADEN_COPY,
  PORTAL_EINLADEN_FOOTNOTE,
  PORTAL_EINLADEN_MAIL,
  PORTAL_EINLADEN_QR,
  PORTAL_EINLADEN_SUBTITLE,
  PORTAL_EINLADEN_TITLE,
} from "../src/lib/portal2/modal-einladen";

let failed = 0;
function assert(name: string, ok: boolean) {
  if (!ok) {
    failed++;
    console.error(`  ✗ ${name}`);
  } else {
    console.log(`  ✓ ${name}`);
  }
}

console.log("portal2 B9 modal-einladen");

assert("title", PORTAL_EINLADEN_TITLE === "Mieter einladen");
assert(
  "subtitle starts",
  PORTAL_EINLADEN_SUBTITLE.startsWith("Teilen Sie diesen Link")
);
assert("copy", PORTAL_EINLADEN_COPY === "Kopieren");
assert("mail", PORTAL_EINLADEN_MAIL === "Per E-Mail senden");
assert("qr", PORTAL_EINLADEN_QR === "QR-Code anzeigen");
assert(
  "footnote template",
  PORTAL_EINLADEN_FOOTNOTE.includes("{objekt}") &&
    PORTAL_EINLADEN_FOOTNOTE.includes("D10")
);
assert(
  "footnote format",
  formatPortalEinladenFootnote("Parkallee 9").includes("Parkallee 9")
);

const mail = buildPortalEinladenMailto(
  "https://example.com/melden/x/y",
  "Parkallee 9"
);
assert("mailto scheme", mail.startsWith("mailto:?"));
assert("mailto has link", mail.includes(encodeURIComponent("https://example.com/melden/x/y")));

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll portal2-einladen checks passed.");
