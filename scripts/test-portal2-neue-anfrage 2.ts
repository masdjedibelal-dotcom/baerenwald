/**
 * Portal 2.0 B8 — modalNeueAnfrage Optionen.
 */
import {
  PORTAL_NEUE_ANFRAGE_OPTIONS,
  PORTAL_NEUE_ANFRAGE_SUBTITLE,
  PORTAL_NEUE_ANFRAGE_TITLE,
} from "../src/lib/portal2/modal-neue-anfrage";

let failed = 0;
function assert(name: string, ok: boolean) {
  if (!ok) {
    failed++;
    console.error(`  ✗ ${name}`);
  } else {
    console.log(`  ✓ ${name}`);
  }
}

console.log("portal2 B8 modal-neue-anfrage");

assert("title", PORTAL_NEUE_ANFRAGE_TITLE === "Neue Anfrage");
assert(
  "subtitle",
  PORTAL_NEUE_ANFRAGE_SUBTITLE === "Wie möchten Sie starten?"
);
assert("5 options", PORTAL_NEUE_ANFRAGE_OPTIONS.length === 5);

const ids = PORTAL_NEUE_ANFRAGE_OPTIONS.map((o) => o.id);
assert(
  "order ids",
  ids.join(",") === "meldung,einladen,projekt,manuell,servicepaket"
);

assert(
  "meldung title",
  PORTAL_NEUE_ANFRAGE_OPTIONS[0]!.title === "Meldung anlegen"
);
assert(
  "meldung sub",
  PORTAL_NEUE_ANFRAGE_OPTIONS[0]!.subtitle ===
    "Schaden oder Anliegen selbst erfassen"
);
assert(
  "einladen title",
  PORTAL_NEUE_ANFRAGE_OPTIONS[1]!.title === "Mieter einladen"
);
assert(
  "servicepaket title",
  PORTAL_NEUE_ANFRAGE_OPTIONS[4]!.title === "Servicepaket bestellen"
);
assert(
  "servicepaket sub",
  PORTAL_NEUE_ANFRAGE_OPTIONS[4]!.subtitle ===
    "Aus dem Leistungskatalog wählen"
);
assert("projekt glyph", PORTAL_NEUE_ANFRAGE_OPTIONS[2]!.glyph === "▧");

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll portal2-neue-anfrage checks passed.");
