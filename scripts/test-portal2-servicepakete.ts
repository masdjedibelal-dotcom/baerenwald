/**
 * Portal 2.0 D5 — Servicepakete Richtpreise + Modal-Wortlaut.
 */
import {
  findServicepaket,
  formatServicepaketPreisAb,
  SERVICEPAKET_CTA,
  SERVICEPAKET_GROESSE_DEFAULT,
  SERVICEPAKET_GROESSEN,
  SERVICEPAKET_KANAL_LIVE,
  SERVICEPAKET_KANAL_VORSCHLAG,
  SERVICEPAKET_OK_BODY,
  SERVICEPAKET_OK_CLOSE,
  SERVICEPAKET_OK_TITLE,
  SERVICEPAKET_PREIS_HINWEIS,
  SERVICEPAKETE,
  SERVICEPAKETE_INTRO,
  SERVICEPAKETE_PAGE_TITLE,
  servicepaketOkHeadline,
  servicepaketPreisAb,
} from "../src/lib/portal2/servicepakete";

let failed = 0;
function assert(name: string, ok: boolean) {
  if (!ok) {
    failed++;
    console.error(`  ✗ ${name}`);
  } else {
    console.log(`  ✓ ${name}`);
  }
}

console.log("portal2 D5 servicepakete");

assert("3 pakete", SERVICEPAKETE.length === 3);
assert(
  "names",
  SERVICEPAKETE.map((p) => p.name).join("|") ===
    "Basis-Wartung|Komfort-Service|Full-Service Plus"
);
assert("komfort beliebt", SERVICEPAKETE[1]!.pop === true);
assert("cta", SERVICEPAKET_CTA === "Anfragen");
assert("page title", SERVICEPAKETE_PAGE_TITLE === "Servicepakete");
assert("intro mentions kündbar", SERVICEPAKETE_INTRO.includes("monatlich kündbar"));
assert(
  "preis hinweis",
  SERVICEPAKET_PREIS_HINWEIS.includes("verbindliche Preis")
);

assert("3 groessen", SERVICEPAKET_GROESSEN.length === 3);
assert("default m", SERVICEPAKET_GROESSE_DEFAULT === "m");

assert("modal title", SERVICEPAKET_OK_TITLE === "Paket angefragt");
assert(
  "modal headline",
  servicepaketOkHeadline("Komfort-Service") === '„Komfort-Service" angefragt'
);
assert(
  "modal body",
  SERVICEPAKET_OK_BODY.includes("verbindlichem Preis")
);
assert("modal close", SERVICEPAKET_OK_CLOSE === "Schließen");

assert("find by id", findServicepaket("basis-wartung")?.name === "Basis-Wartung");
assert(
  "find by name",
  findServicepaket("Full-Service Plus")?.preisEur === 690
);
assert("unknown null", findServicepaket("xyz") === undefined);

assert("kanal live", SERVICEPAKET_KANAL_LIVE === "org_service");
assert("kanal vorschlag", SERVICEPAKET_KANAL_VORSCHLAG === "servicepaket");

assert(
  "basis feats",
  SERVICEPAKETE[0]!.feats[0] === "1 Wartungsbesuch / Quartal"
);
assert(
  "full feats last",
  SERVICEPAKETE[2]!.feats.includes("Quartalsreporting")
);

const komfort = SERVICEPAKETE[1]!;
assert("preis s", servicepaketPreisAb(komfort, "s") === 349);
assert("preis m", servicepaketPreisAb(komfort, "m") === 470);
assert("preis l", servicepaketPreisAb(komfort, "l") === 630);
assert(
  "format ab",
  formatServicepaketPreisAb(470) === "ab 470 €"
);
assert(
  "rechts teurer als mitte",
  servicepaketPreisAb(SERVICEPAKETE[2]!, "m") >
    servicepaketPreisAb(SERVICEPAKETE[1]!, "m")
);
assert(
  "mitte teurer als links",
  servicepaketPreisAb(SERVICEPAKETE[1]!, "m") >
    servicepaketPreisAb(SERVICEPAKETE[0]!, "m")
);

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll portal2-servicepakete checks passed.");
