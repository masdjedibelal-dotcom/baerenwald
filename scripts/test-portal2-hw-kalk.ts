/**
 * Portal 2.0 D11 — HW-Kalkulation Helpers.
 */
import {
  ANGEBOT_HERKUNFT_HANDWERKER,
  DEFAULT_HW_POSITIONEN,
  HW_ABSCHLUSS_CHECKS,
  HW_MWST_SATZ,
  hwKalkAdd,
  hwKalkDel,
  hwKalkPatch,
  hwKalkSumme,
  hwKalkValid,
  parseHwMengeFaktor,
} from "../src/lib/portal2/hw-kalkulation";
import { pickEmpfohlenesAngebot, type HvOfferCard } from "../src/lib/portal2/hv-detail";

let failed = 0;
function assert(name: string, ok: boolean) {
  if (!ok) {
    failed++;
    console.error(`  ✗ ${name}`);
  } else {
    console.log(`  ✓ ${name}`);
  }
}

console.log("portal2 D11 hw-kalkulation");

assert("default 4 pos", DEFAULT_HW_POSITIONEN.length === 4);
assert("mwst 19", HW_MWST_SATZ === 0.19);
assert("herkunft const", ANGEBOT_HERKUNFT_HANDWERKER === "handwerker");
assert("checks 4", HW_ABSCHLUSS_CHECKS.length === 4);

assert("menge 1,5", Math.abs(parseHwMengeFaktor("1,5 Std.") - 1.5) < 0.001);
assert("menge psch", parseHwMengeFaktor("1 Psch.") === 1);

const sum = hwKalkSumme(DEFAULT_HW_POSITIONEN);
const expectedNet =
  75 * 1 + 129 * 1 + 68 * 1.5 + 18 * 1;
assert("default net", Math.abs(sum.net - expectedNet) < 0.01);
assert("default mwst", Math.abs(sum.mwst - expectedNet * 0.19) < 0.01);
assert("default brutto", Math.abs(sum.brutto - expectedNet * 1.19) < 0.01);

let pos = DEFAULT_HW_POSITIONEN.map((p) => ({ ...p }));
pos = hwKalkPatch(pos, 0, "einzel", 100);
assert("patch einzel", pos[0]!.einzel === 100);
pos = hwKalkAdd(pos);
assert("add", pos.length === 5 && pos[4]!.pos === "");
pos = hwKalkDel(pos, 4);
assert("del", pos.length === 4);
assert("valid", hwKalkValid(pos));
assert("invalid empty", !hwKalkValid([{ pos: "", menge: "1", einzel: 0, gewerk: "X" }]));

const offers: HvOfferCard[] = [
  { id: "crm", name: "CRM", trade: "Sanitär", betrag: 400, empfohlen: true, herkunft: "crm" },
  {
    id: "hw",
    name: "HW",
    trade: "Sanitär",
    betrag: 450,
    empfohlen: false,
    herkunft: "handwerker",
  },
];
assert("pick herkunft handwerker", pickEmpfohlenesAngebot(offers)?.id === "hw");

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll D11 hw-kalkulation assertions passed.");
