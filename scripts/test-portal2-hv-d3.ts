/**
 * Portal 2.0 D3 — HV Detail helpers.
 */
import {
  HV_DEFAULT_SCHWELLE_EUR,
  HV_DETAIL_COPY,
  angebotSumme,
  angebotSummeFromPositionen,
  buildAbschlagsplan,
  formatHvVerlaufLine,
  hvRoleActionKind,
  moneyEur,
  pickEmpfohlenesAngebot,
  type HvOfferCard,
} from "../src/lib/portal2/hv-detail";
import {
  buildHvOffersFromItem,
  inferFlowFromKundeItem,
} from "../src/lib/portal2/hv-detail-adapters";
import { portalFlowTimeline } from "../src/lib/portal2/status-mapping";

let failed = 0;
function assert(name: string, ok: boolean) {
  if (!ok) {
    failed++;
    console.error(`  ✗ ${name}`);
  } else {
    console.log(`  ✓ ${name}`);
  }
}

console.log("portal2 D3 hv-detail");

const sum = angebotSumme(100);
assert("netto 100", Math.abs(sum.net - 100) < 0.001);
assert("mwst 19", Math.abs(sum.mwst - 19) < 0.001);
assert("brutto 119", Math.abs(sum.brutto - 119) < 0.001);

const fromPos = angebotSummeFromPositionen([
  { pos: "A", menge: "2", gewerk: "Sanitär", einzel: 50 },
]);
assert("pos netto 100", Math.abs(fromPos.net - 100) < 0.001);

const plan = buildAbschlagsplan(200, "Sanitär");
assert("2 raten", plan.length === 2);
assert("50%", Math.abs(plan[0]!.amount - 100) < 0.001);

assert(
  "verlauf format",
  formatHvVerlaufLine({
    t: "Gerade eben",
    txt: "Freigegeben",
    who: "Verwaltung",
  }) === "Gerade eben · Freigegeben · Verwaltung"
);

assert("freigabe kind", hvRoleActionKind("gemeldet") === "freigabe");
assert(
  "privat auto",
  hvRoleActionKind("gemeldet", { privatkunde: true }) === "privat_auto"
);
assert("angebot kind", hvRoleActionKind("angebot") === "angebot");
assert("copy freigabe", HV_DETAIL_COPY.freigabeTitle === "Freigabe erforderlich");
assert(
  "copy empfohlen",
  HV_DETAIL_COPY.empfohlenDetail === "Leistungen & Preise"
);
assert("copy rechnung", HV_DETAIL_COPY.rechnungsbetrag === "Rechnungsbetrag");
assert(
  "ueberweisung offen punkt",
  HV_DETAIL_COPY.ueberweisungOffen.includes("Überweisung")
);
assert("privat hint", HV_DETAIL_COPY.privatAuto.includes("Privatkunde"));
assert("default schwelle", HV_DEFAULT_SCHWELLE_EUR === 500);
assert("money", moneyEur(10).includes("10"));

const offers: HvOfferCard[] = [
  {
    id: "1",
    name: "A",
    trade: "Sanitär",
    betrag: 100,
    empfohlen: false,
  },
  {
    id: "2",
    name: "B",
    trade: "Sanitär",
    betrag: 120,
    empfohlen: true,
  },
];
assert("pick empfohlen", pickEmpfohlenesAngebot(offers)?.id === "2");
assert(
  "entscheidung 10 one display",
  pickEmpfohlenesAngebot(offers) != null && offers.length >= 1
);

const tl = portalFlowTimeline("auftrag");
assert("timeline 5", tl.length === 5);
assert("auftrag active", tl.find((s) => s.id === "auftrag")?.active === true);

const flow = inferFlowFromKundeItem(
  {
    id: "x",
    title: "T",
    sections: [],
    isAngebotDetail: true,
    needsAction: true,
  },
  { orgFreigabeStatus: "ausstehend" }
);
assert("infer angebot", flow === "angebot");

const built = buildHvOffersFromItem(
  {
    id: "a1",
    title: "Angebot",
    sections: [],
    isAngebotDetail: true,
    gesamtBrutto: 500,
  },
  "Sanitär Nord"
);
assert("built empfohlen", built[0]?.empfohlen === true && built.length === 1);

const offersHw: HvOfferCard[] = [
  { id: "1", name: "A", trade: "X", betrag: 100, empfohlen: true, herkunft: "crm" },
  {
    id: "2",
    name: "B",
    trade: "X",
    betrag: 120,
    empfohlen: false,
    herkunft: "handwerker",
  },
];
assert(
  "d11 herkunft handwerker bevorzugt",
  pickEmpfohlenesAngebot(offersHw)?.id === "2"
);

const builtHw = buildHvOffersFromItem(
  {
    id: "a2",
    title: "HW",
    sections: [],
    isAngebotDetail: true,
    gesamtBrutto: 300,
    angebotHerkunft: "handwerker",
  },
  null
);
assert(
  "built herkunft",
  builtHw[0]?.herkunft === "handwerker" && builtHw[0]?.empfohlen === true
);

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll portal2-hv-d3 checks passed.");
