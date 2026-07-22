/**
 * Portal 2.0 B7 — modalShell Konstanten.
 */
import {
  PORTAL_MODAL_DEFAULT_MAX_W,
  PORTAL_MODAL_SCRIM,
  PORTAL_MODAL_Z_INDEX,
} from "../src/lib/portal2/modal-shell";

let failed = 0;
function assert(name: string, ok: boolean) {
  if (!ok) {
    failed++;
    console.error(`  ✗ ${name}`);
  } else {
    console.log(`  ✓ ${name}`);
  }
}

console.log("portal2 B7 modal-shell");

assert("default maxW 460", PORTAL_MODAL_DEFAULT_MAX_W === 460);
assert("zIndex 200", PORTAL_MODAL_Z_INDEX === 200);
assert(
  "scrim",
  PORTAL_MODAL_SCRIM === "rgba(16,25,20,.42)"
);

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll portal2-modal checks passed.");
