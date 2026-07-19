/**
 * Portal 2.0 B3 — canCreate / createLabel.
 */
import {
  portalCanCreate,
  portalCreateLabel,
} from "../src/lib/portal2/create";

let failed = 0;
function assert(name: string, ok: boolean) {
  if (!ok) {
    failed++;
    console.error(`  ✗ ${name}`);
  } else {
    console.log(`  ✓ ${name}`);
  }
}

console.log("portal2 B3 create");

assert("handwerker no create", portalCanCreate("handwerker") === false);
assert("kunde_hv can create", portalCanCreate("kunde_hv") === true);
assert("kunde_privat can create", portalCanCreate("kunde_privat") === true);
assert("mieter can create", portalCanCreate("mieter") === true);
assert("eigentuemer can create", portalCanCreate("eigentuemer") === true);

assert(
  "label mieter",
  portalCreateLabel("mieter") === "Schaden melden"
);
assert(
  "label eigentuemer",
  portalCreateLabel("eigentuemer") === "Anfrage erstellen"
);
assert("label kunde_hv", portalCreateLabel("kunde_hv") === "Neuer Vorgang");
assert(
  "label kunde_privat",
  portalCreateLabel("kunde_privat") === "Neuer Vorgang"
);
assert(
  "label handwerker (unused)",
  portalCreateLabel("handwerker") === "Neuer Vorgang"
);

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll portal2-create checks passed.");
