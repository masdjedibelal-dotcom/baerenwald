/**
 * Regression: HW sieht nur Partner-EK-Netto, nie Kunden-VK als Fallback.
 * Run: npx tsx scripts/test-partner-netto-preise.ts
 */

import assert from "node:assert/strict";

import {
  buildPartnerKonditionZeilen,
} from "../src/lib/partner/partner-konditionen";
import { buildPartnerAuftragKonditionZeilen } from "../src/lib/partner/partner-leistungen-display";
import type { PartnerAuftragPosition } from "../src/lib/partner/get-partner-data";

function check(name: string, actual: unknown, expected: unknown): void {
  assert.equal(actual, expected, name);
  console.log(`ok  ${name}`);
}

// Angebot-JSON: nur einkaufspreis × Menge
const ausAngebot = buildPartnerKonditionZeilen(
  [
    {
      id: "a1",
      leistung: "Fliesen",
      menge: 10,
      einkaufspreis: 25,
      lohn_netto: 80,
      material_netto: 20,
      mwst_satz: 19,
    },
  ],
  {}
);
check("EK × Menge = 250", ausAngebot[0]?.vorschlagNetto, 250);

const ohneEk = buildPartnerKonditionZeilen(
  [
    {
      id: "a2",
      leistung: "Ohne EK",
      menge: 2,
      lohn_netto: 100,
      material_netto: 50,
    },
  ],
  {}
);
check(
  "ohne einkaufspreis → null (kein VK-Fallback)",
  ohneEk[0]?.vorschlagNetto ?? null,
  null
);

// Auftrag: nur preis_partner
const pos: PartnerAuftragPosition[] = [
  {
    id: "p1",
    gewerk_name: "Sanitär",
    leistung_name: "WC tauschen",
    beschreibung: null,
    menge: 2,
    einheit: "Stk",
    start_datum: null,
    end_datum: null,
    preis_partner: 180,
    lohn_fix: 400,
    material_fix: 100,
  },
  {
    id: "p2",
    gewerk_name: "Sanitär",
    leistung_name: "Ohne Partnerpreis",
    beschreibung: null,
    menge: 1,
    einheit: "pauschal",
    start_datum: null,
    end_datum: null,
    preis_partner: null,
    lohn_fix: 999,
    material_fix: 1,
  },
];

const auftragZeilen = buildPartnerAuftragKonditionZeilen(pos);
check("preis_partner unverändert netto", auftragZeilen[0]?.vorschlagNetto, 180);
check(
  "ohne preis_partner → null (kein lohn_fix-Fallback)",
  auftragZeilen[1]?.vorschlagNetto ?? null,
  null
);
check(
  "kein × Menge auf lohn_fix (sonst 1000)",
  auftragZeilen[1]?.vorschlagNetto === 1000,
  false
);

console.log("\nAlle Partner-Netto-Preis-Checks bestanden.");
