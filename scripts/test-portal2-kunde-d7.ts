/**
 * Portal 2.0 D7 — kundeTyp + Privat-Dashboard/Liste.
 */
import {
  portalKundeDashboardHello,
  portalKundeListeTitle,
  portalKundeTypRoleLabel,
  portalNavRoleForKundeTyp,
  resolvePortalKundeTyp,
} from "../src/lib/portal2/kunde-typ";
import {
  buildPrivatDashboardKpis,
  PRIVAT_LISTE_CHIPS,
  privatListeChipMatches,
} from "../src/lib/portal2/kunde-dashboard";
import { emptyHvFlowCounts } from "../src/lib/portal2/hv-dashboard";
import { HV_DETAIL_COPY } from "../src/lib/portal2/hv-detail";
import { hvRoleActionKind } from "../src/lib/portal2/hv-detail";

let failed = 0;
function assert(name: string, ok: boolean) {
  if (!ok) {
    failed++;
    console.error(`  ✗ ${name}`);
  } else {
    console.log(`  ✓ ${name}`);
  }
}

console.log("portal2 D7 kunde privat/gewerbe");

assert(
  "org → hv",
  resolvePortalKundeTyp({ portal_modus: "organisation" }) === "hv"
);
assert(
  "privat default",
  resolvePortalKundeTyp({ portal_modus: "privat" }) === "privat"
);
assert(
  "gewerbe typ",
  resolvePortalKundeTyp({ portal_modus: "privat", typ: "gewerbe" }) ===
    "gewerbe"
);
assert(
  "nav privat",
  portalNavRoleForKundeTyp("privat") === "kunde_privat" &&
    portalNavRoleForKundeTyp("gewerbe") === "kunde_privat"
);
assert("nav hv", portalNavRoleForKundeTyp("hv") === "kunde_hv");
assert(
  "liste title",
  portalKundeListeTitle("privat") === "Meine Vorgänge" &&
    portalKundeListeTitle("hv") === "Vorgänge"
);
assert(
  "role label",
  portalKundeTypRoleLabel("privat") === "Privatkunde" &&
    portalKundeTypRoleLabel("gewerbe") === "Gewerbe"
);
assert(
  "hello",
  portalKundeDashboardHello("privat", "Martin Albrecht").startsWith("Hallo")
);

const flow = emptyHvFlowCounts();
flow.gemeldet = 1;
flow.angebot = 2;
flow.auftrag = 1;
flow.abschluss = 2;
const kpis = buildPrivatDashboardKpis(flow);
assert("kpi offen", kpis.offen === 3);
assert("kpi arbeit", kpis.in_arbeit === 1);
assert("kpi erledigt", kpis.erledigt === 2);

assert("4 chips", PRIVAT_LISTE_CHIPS.length === 4);
assert("chip offen gemeldet", privatListeChipMatches("offen", "gemeldet"));
assert("chip arbeit", privatListeChipMatches("arbeit", "auftrag"));
assert(
  "chip done",
  privatListeChipMatches("abgeschlossen", "bezahlt")
);

assert(
  "privat auto copy",
  HV_DETAIL_COPY.privatAuto === "Automatisch freigegeben (Privatkunde)"
);
assert(
  "action privat_auto",
  hvRoleActionKind("gemeldet", { privatkunde: true }) === "privat_auto"
);
assert(
  "action freigabe hv",
  hvRoleActionKind("gemeldet", { privatkunde: false }) === "freigabe"
);

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll portal2-kunde-d7 checks passed.");
