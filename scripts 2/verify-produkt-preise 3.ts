/**
 * Verifiziert: produktPreis(slug) === calculatePrice(produktToFunnelState(slug))
 * Ausführen: npx tsx scripts/verify-produkt-preise.ts
 */
import { calculatePrice } from "@/lib/funnel/price-calc";
import { BAD_PRODUKTE } from "@/lib/products/katalog-bad";
import { produktPreis } from "@/lib/products/produkt-preis";
import { produktToFunnelState } from "@/lib/products/produkt-to-funnel";
import { FIX_PRODUKTE } from "@/lib/products/katalog-fix";
import { GARTEN_PRODUKTE } from "@/lib/products/katalog-garten";

let failed = 0;

for (const p of BAD_PRODUKTE) {
  const state = produktToFunnelState(p.slug);
  if (!state) {
    console.error(`FAIL ${p.slug}: no state`);
    failed++;
    continue;
  }
  const viaProdukt = produktPreis(p.slug);
  const viaCalc = calculatePrice(state, { preview: true });
  if (
    !viaProdukt ||
    Math.round(viaProdukt.min) !== Math.round(viaCalc.min) ||
    Math.round(viaProdukt.max) !== Math.round(viaCalc.max)
  ) {
    console.error(
      `FAIL ${p.slug}: calc=${viaCalc.min}-${viaCalc.max} produkt=${viaProdukt?.min}-${viaProdukt?.max}`
    );
    failed++;
  } else {
    console.log(`OK ${p.slug}: ${viaCalc.min} – ${viaCalc.max} €`);
  }
}

for (const p of [...FIX_PRODUKTE, ...GARTEN_PRODUKTE]) {
  const state = produktToFunnelState(p.slug);
  const viaProdukt = produktPreis(p.slug);
  const viaCalc = state ? calculatePrice(state, { preview: true }) : null;
  if (!viaProdukt || !viaCalc || viaProdukt.min !== viaCalc.min) {
    console.error(
      `FAIL ${p.slug}: produkt=${viaProdukt?.min} calc=${viaCalc?.min}`
    );
    failed++;
  } else if (viaCalc.min > 0) {
    console.log(`OK ${p.slug}: ${viaCalc.min} – ${viaCalc.max} €`);
  } else {
    console.log(`WARN ${p.slug}: price 0 (mapping prüfen)`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} Fehler`);
  process.exit(1);
}
console.log("\nAlle Produkt-Preise konsistent.");
