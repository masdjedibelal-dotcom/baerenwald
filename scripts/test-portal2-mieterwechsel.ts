/**
 * Turn-Paket Mieterwechsel — Preislogik Welle 3.
 */
import {
  berechneMieterwechselPreis,
  formatMieterwechselPreis,
  formatMieterwechselPreisPrefix,
  MIETERWECHSEL_STUFEN,
  MIETERWECHSEL_ZUBUCH,
  mieterwechselCta,
  STUFE1_FIX,
  STUFE2_M2_SATZ,
  stufe1Preis,
  stufe2Fixpreis,
} from "../src/lib/portal2/mieterwechsel";

let failed = 0;
function assert(name: string, ok: boolean) {
  if (!ok) {
    failed++;
    console.error(`  ✗ ${name}`);
  } else {
    console.log(`  ✓ ${name}`);
  }
}

console.log("portal2 mieterwechsel turn-paket");

assert("3 stufen", MIETERWECHSEL_STUFEN.length === 3);
assert(
  "namen",
  MIETERWECHSEL_STUFEN.map((s) => s.name).join("|") ===
    "Übergabefertig|Neuvermietungsfertig|Renoviert"
);
assert("4 zubuch", MIETERWECHSEL_ZUBUCH.length === 4);

assert("stufe1 46_75", stufe1Preis("46_75") === 890);
assert("stufe1 bis_45", STUFE1_FIX.bis_45 === 690);
assert("stufe1 ueber_100", STUFE1_FIX.ueber_100 === 1290);
assert("m2 satz 32", STUFE2_M2_SATZ === 32);

const s2 = stufe2Fixpreis("46_75", 60);
assert("stufe2 fix 890+60*32", s2 === 890 + 60 * 32);

const p1 = berechneMieterwechselPreis({ stufe: 1, groesse: "bis_45" });
assert("stufe1 fix", p1.isFix && p1.min === 690 && p1.max === 690);

const p2exact = berechneMieterwechselPreis({
  stufe: 2,
  groesse: "46_75",
  m2: 68,
});
assert(
  "stufe2 mit m2 fix",
  p2exact.isFix && p2exact.min === 890 + 68 * 32
);

const p2band = berechneMieterwechselPreis({
  stufe: 2,
  groesse: "46_75",
});
assert("stufe2 ohne m2 band", !p2band.isFix && p2band.min < p2band.max);

const p3 = berechneMieterwechselPreis({
  stufe: 3,
  groesse: "46_75",
  m2: 60,
  module: ["boden", "bad"],
});
assert("stufe3 immer angebot", !p3.isFix);
assert("stufe3 > stufe2", p3.min > stufe2Fixpreis("46_75", 60));

const withZ = berechneMieterwechselPreis({
  stufe: 1,
  groesse: "bis_45",
  zubuch: ["endreinigung", "entruempelung"],
});
assert(
  "zubuch addiert",
  withZ.isFix && withZ.min === 690 + 240 + 390
);

const withMontage = berechneMieterwechselPreis({
  stufe: 1,
  groesse: "bis_45",
  zubuch: ["kueche-montage"],
});
assert("montage bricht fix", !withMontage.isFix);

assert(
  "label fix",
  formatMieterwechselPreis({ min: 890, max: 890, isFix: true }) === "890 €"
);
assert(
  "prefix indikation",
  formatMieterwechselPreisPrefix(
    berechneMieterwechselPreis({ stufe: 3, groesse: "bis_45", m2: 40 })
  ).startsWith("Indikation")
);
assert("cta fix", mieterwechselCta(1, true) === "Beauftragen");
assert("cta angebot", mieterwechselCta(3, false) === "Angebot anfordern");

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll mieterwechsel checks passed.");
