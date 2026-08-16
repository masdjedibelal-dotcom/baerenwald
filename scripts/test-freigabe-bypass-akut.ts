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
import { ALL_AKUT_FALL_IDS } from "../src/lib/org/sofortmassnahme-faelle";

function check(name: string, actual: unknown, expected: unknown): void {
  assert.equal(actual, expected, name);
  console.log(`ok  ${name}`);
}

const ALL = ALL_AKUT_FALL_IDS;

check(
  "klingel/sonstiges → kein Direktauftrag",
  isMeldeDirektauftrag(
    "sonstiges",
    {
      melde_problem: "klingel",
      melde_seit_wann: "eine_woche",
    },
    ALL
  ),
  false
);

check(
  "Leere HV-Liste → kein Direktauftrag (auch bei akutem Symptom)",
  isMeldeDirektauftrag(
    "wasser",
    {
      melde_problem: "wasser_austritt",
      melde_laeuft_noch: "ja",
    },
    []
  ),
  false
);

check(
  "Whitelist ohne diesen Fall → kein Direktauftrag",
  isMeldeDirektauftrag(
    "wasser",
    {
      melde_problem: "wasser_austritt",
      melde_laeuft_noch: "ja",
    },
    ["strom_kein"]
  ),
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
  isMeldeDirektauftrag(
    "wasser",
    {
      melde_problem: "wasser_austritt",
      melde_laeuft_noch: "ja",
    },
    ALL
  ),
  true
);

check(
  "Wasser Verstopfung → kein Direktauftrag",
  isMeldeDirektauftrag(
    "wasser",
    {
      melde_problem: "verstopfung",
    },
    ALL
  ),
  false
);

check(
  "Heizung alles kalt → Direktauftrag",
  isMeldeDirektauftrag(
    "heizung",
    {
      melde_problem: "wohnung_kalt",
      melde_heizung_kalt: "ja",
    },
    ALL
  ),
  true
);

check(
  "Heizung kein Warmwasser → Direktauftrag",
  isMeldeDirektauftrag(
    "heizung",
    {
      melde_problem: "kein_warmwasser",
    },
    ALL
  ),
  true
);

check(
  "Heizung Geräusche → kein Direktauftrag",
  isMeldeDirektauftrag(
    "heizung",
    {
      melde_problem: "geraeusche",
    },
    ALL
  ),
  false
);

check(
  "Strom kein Strom → Direktauftrag",
  isMeldeDirektauftrag(
    "strom",
    {
      melde_problem: "kein_strom",
    },
    ALL
  ),
  true
);

check(
  "Strom FI wieder raus → Direktauftrag",
  isMeldeDirektauftrag(
    "strom",
    {
      melde_problem: "fi_sicherung",
      melde_sicherung_raus: "ja",
      melde_wieder_raus: "ja",
    },
    ALL
  ),
  true
);

check(
  "Strom einzelner Punkt → kein Direktauftrag",
  isMeldeDirektauftrag(
    "strom",
    {
      melde_problem: "einzelner_punkt",
    },
    ALL
  ),
  false
);

check(
  "Fenster Scheibe kaputt → Direktauftrag",
  isMeldeDirektauftrag(
    "fenster_tuer",
    {
      melde_problem: "scheibe_kaputt",
    },
    ALL
  ),
  true
);

check(
  "Fenster Tür nicht zu Wohnungs-/Haustür → Direktauftrag",
  isMeldeDirektauftrag(
    "fenster_tuer",
    {
      melde_problem: "tuer_schloss",
      melde_ort_tuer: "wohnungstuer",
      melde_geht_zu: "nein",
    },
    ALL
  ),
  true
);

check(
  "Fenster Tür klemmt aber geht zu → kein Direktauftrag",
  isMeldeDirektauftrag(
    "fenster_tuer",
    {
      melde_problem: "tuer_schloss",
      melde_ort_tuer: "wohnungstuer",
      melde_geht_zu: "ja",
    },
    ALL
  ),
  false
);

check(
  "Fenster Balkontür nicht zu → kein Direktauftrag",
  isMeldeDirektauftrag(
    "fenster_tuer",
    {
      melde_problem: "tuer_schloss",
      melde_ort_tuer: "balkontuer",
      melde_geht_zu: "nein",
    },
    ALL
  ),
  false
);

check(
  "Dach Rinne bei Regen → Direktauftrag",
  isMeldeDirektauftrag(
    "dach",
    {
      melde_problem: "regenrinne_ueber",
      melde_bei_regen: "ja",
    },
    ALL
  ),
  true
);

check(
  "Dach Ziegel unklar → Direktauftrag",
  isMeldeDirektauftrag(
    "dach",
    {
      melde_problem: "ziegel_boden",
      melde_bei_regen: "weiss_nicht",
    },
    ALL
  ),
  true
);

check(
  "Dach Rinne nicht bei Regen → kein Direktauftrag",
  isMeldeDirektauftrag(
    "dach",
    {
      melde_problem: "regenrinne_ueber",
      melde_bei_regen: "nein",
    },
    ALL
  ),
  false
);

check(
  "Schimmel → kein Direktauftrag",
  isMeldeDirektauftrag(
    "schimmel",
    {
      melde_problem: "schimmel_feucht",
      melde_ort: "bad",
    },
    ALL
  ),
  false
);

console.log("\nAlle Freigabe-Bypass-Checks bestanden.");
