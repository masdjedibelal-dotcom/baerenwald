/**
 * Portal 2.0 D5 — Servicepakete Mock-Karten + Modal-Wortlaut.
 */
import {
  findServicepaket,
  SERVICEPAKET_CTA,
  SERVICEPAKET_KANAL_LIVE,
  SERVICEPAKET_KANAL_VORSCHLAG,
  SERVICEPAKET_OK_BODY,
  SERVICEPAKET_OK_CLOSE,
  SERVICEPAKET_OK_TITLE,
  SERVICEPAKETE,
  SERVICEPAKETE_INTRO,
  SERVICEPAKETE_PAGE_TITLE,
  servicepaketOkHeadline,
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
assert("names", SERVICEPAKETE.map((p) => p.name).join("|") ===
  "Basis-Wartung|Komfort-Service|Full-Service Plus");
assert("komfort beliebt", SERVICEPAKETE[1]!.pop === true);
assert("cta", SERVICEPAKET_CTA === "Paket wählen");
assert("page title", SERVICEPAKETE_PAGE_TITLE === "Servicepakete");
assert("intro mentions kündbar", SERVICEPAKETE_INTRO.includes("monatlich kündbar"));

assert("modal title", SERVICEPAKET_OK_TITLE === "Paket angefragt");
assert(
  "modal headline",
  servicepaketOkHeadline("Komfort-Service") === '„Komfort-Service" angefragt'
);
assert(
  "modal body",
  SERVICEPAKET_OK_BODY ===
    "Ihr Ansprechpartner bei Bärenwald meldet sich zur Objekt-Zuordnung und Aktivierung."
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

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll portal2-servicepakete checks passed.");
