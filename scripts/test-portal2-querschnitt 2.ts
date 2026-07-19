/**
 * Portal 2.0 TEIL G — Querschnitt.
 */
import {
  ANGEBOT_MWST_RATE,
  angebotSumme,
  angebotSummeFromPositionen,
} from "../src/lib/portal2/angebot-summe";
import {
  formatVerlaufLine,
  prependVerlaufEntry,
  VERLAUF_JUST_NOW,
} from "../src/lib/portal2/verlauf";
import {
  isPortalMobileView,
  resolvePortalView,
} from "../src/lib/portal2/viewport";

let failed = 0;
function assert(name: string, ok: boolean) {
  if (!ok) {
    failed++;
    console.error(`  ✗ ${name}`);
  } else {
    console.log(`  ✓ ${name}`);
  }
}

console.log("portal2 TEIL G querschnitt");

const sum = angebotSumme(100);
assert("mwst rate", ANGEBOT_MWST_RATE === 0.19);
assert("sum net", sum.net === 100);
assert("sum mwst", Math.abs(sum.mwst - 19) < 1e-9);
assert("sum brutto", Math.abs(sum.brutto - 119) < 1e-9);

const fromPos = angebotSummeFromPositionen([
  { pos: "1", menge: "2", gewerk: "Sanitär", einzel: 50 },
]);
assert("pos net", fromPos.net === 100);

const log = prependVerlaufEntry([], "Freigabe erteilt", "HV");
assert("verlauf just now", log[0]!.t === VERLAUF_JUST_NOW);
assert("verlauf who", log[0]!.who === "HV");
assert(
  "verlauf line",
  formatVerlaufLine(log[0]!) === "Gerade eben · Freigabe erteilt · HV"
);

assert("view mobile", resolvePortalView(800) === "mobile");
assert("view desktop", resolvePortalView(1200) === "desktop");
assert("is mobile", isPortalMobileView("mobile"));

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll portal2-querschnitt checks passed.");
