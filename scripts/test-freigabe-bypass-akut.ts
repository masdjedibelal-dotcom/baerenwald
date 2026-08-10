/**
 * Regression: Kein Schwellen-/Akut-Banner aus Preisindikation.
 * Run: npx tsx scripts/test-freigabe-bypass-akut.ts
 */

import assert from "node:assert/strict";
import {
  hvFreigabeEntfaellt,
  resolveAngebotZugestelltForHvFreigabe,
} from "../src/lib/org/freigabe-bypass";
import { isMeldeDirektauftrag } from "../src/lib/funnel/melde-direktauftrag";

function check(name: string, actual: unknown, expected: unknown): void {
  assert.equal(actual, expected, name);
  console.log(`ok  ${name}`);
}

check(
  "klingel/sonstiges → kein Direktauftrag",
  isMeldeDirektauftrag("sonstiges", {
    melde_problem: "klingel",
    melde_seit_wann: "eine_woche",
  }),
  false
);

const hvSelbstOhneAngebot = {
  orgFreigabeStatus: "nicht_noetig",
  bypassGrund: null as string | null,
  funnelDirektauftrag: false,
  hvMeldungStatus: "neu",
  angebotZugestellt: false,
};

check(
  "HV-Vorgang ohne Angebot → kein Banner",
  hvFreigabeEntfaellt(hvSelbstOhneAngebot),
  null
);

check(
  "nicht_noetig + Fake-Angebot-Heuristik → trotzdem kein Schwelle-Banner",
  hvFreigabeEntfaellt({
    ...hvSelbstOhneAngebot,
    angebotZugestellt: true,
  }),
  null
);

check(
  "Schwelle-Bypass ohne Angebot-Flag → kein Banner (Caller muss Flag setzen)",
  hvFreigabeEntfaellt({
    orgFreigabeStatus: "nicht_noetig",
    bypassGrund: "schwelle",
    angebotZugestellt: false,
  }),
  null
);

check(
  "Schwelle-Bypass + zugestelltes Angebot → schwelle",
  hvFreigabeEntfaellt({
    orgFreigabeStatus: "ausstehend",
    bypassGrund: "schwelle",
    angebotZugestellt: true,
  }),
  "schwelle"
);

check(
  "nicht_noetig + Bypass schwelle + resolveAngebotZugestellt → schwelle",
  hvFreigabeEntfaellt({
    orgFreigabeStatus: "nicht_noetig",
    bypassGrund: "schwelle",
    angebotZugestellt: resolveAngebotZugestelltForHvFreigabe({
      orgFreigabeStatus: "nicht_noetig",
      bypassGrund: "schwelle",
    }),
  }),
  "schwelle"
);

check(
  "Echter Akut-Bypass → akut",
  hvFreigabeEntfaellt({
    ...hvSelbstOhneAngebot,
    bypassGrund: "akut",
  }),
  "akut"
);

check(
  "Funnel-Direktauftrag → akut",
  hvFreigabeEntfaellt({
    ...hvSelbstOhneAngebot,
    funnelDirektauftrag: true,
  }),
  "akut"
);

check(
  "Wasser läuft noch → Direktauftrag",
  isMeldeDirektauftrag("wasser", {
    melde_problem: "tropft",
    melde_laeuft_noch: "ja",
  }),
  true
);

console.log("\nAlle Freigabe-Bypass-Checks bestanden.");
