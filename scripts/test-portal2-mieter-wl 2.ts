/**
 * Portal 2.0 D9 — Mieter-Weblink (STG + wlFehler + Footer).
 */
import { MIETER_STG } from "../src/lib/portal2/status";
import {
  MIETER_WL_BESTAETIGUNG,
  MIETER_WL_FEHLER,
  MIETER_WL_FOOTER,
  MIETER_WL_OBJEKT,
  MIETER_WL_STATUS,
  buildMieterStgTimeline,
  formatMieterStgHeadline,
  formatMieterWlFooterContact,
  mieterStgActiveCopy,
  mieterWlFooterNoreply,
  mieterWlLogoLetter,
} from "../src/lib/portal2/mieter-wl";

let failed = 0;
function assert(name: string, ok: boolean) {
  if (!ok) {
    failed++;
    console.error(`  ✗ ${name}`);
  } else {
    console.log(`  ✓ ${name}`);
  }
}

console.log("portal2 D9 mieter weblink");

assert("STG 4 steps", MIETER_STG.length === 4);
assert(
  "STG eingegangen de",
  MIETER_STG[0]!.title_de === "Eingegangen" &&
    MIETER_STG[0]!.subtitle_de ===
      "Ihre Meldung ist bei Ihrer Hausverwaltung eingegangen."
);
assert(
  "STG bearbeitung de",
  MIETER_STG[1]!.title_de === "In Bearbeitung" &&
    MIETER_STG[1]!.subtitle_de ===
      "Ihre Hausverwaltung bearbeitet Ihre Meldung."
);
assert(
  "STG beauftragt de",
  MIETER_STG[2]!.title_de === "Beauftragt" &&
    MIETER_STG[2]!.subtitle_de ===
      "Ein Fachbetrieb wurde von Ihrer Hausverwaltung beauftragt."
);
assert(
  "STG erledigt en",
  MIETER_STG[3]!.title_en === "Completed" &&
    MIETER_STG[3]!.subtitle_en === "The work has been completed."
);

const headline = formatMieterStgHeadline("eingegangen", "de");
assert(
  "headline format",
  headline ===
    "Eingegangen — Ihre Meldung ist bei Ihrer Hausverwaltung eingegangen."
);

const tl = buildMieterStgTimeline("beauftragt", "de");
assert("timeline active beauftragt", tl[2]!.active && tl[0]!.done && tl[1]!.done);
assert(
  "active subtitle",
  mieterStgActiveCopy("in_bearbeitung", "en").subtitle ===
    "Your property manager is handling your report."
);

assert(
  "wlFehler title de",
  MIETER_WL_FEHLER.title_de === "Link nicht verfügbar"
);
assert(
  "wlFehler body de",
  MIETER_WL_FEHLER.body_de ===
    "Dieser Melde-Link ist ungültig oder wurde deaktiviert. Bitte wenden Sie sich an Ihre Hausverwaltung."
);
assert(
  "wlFehler body en",
  MIETER_WL_FEHLER.body_en.includes("invalid or has been disabled")
);

assert(
  "objekt title",
  MIETER_WL_OBJEKT.title_de === "Schaden melden" &&
    MIETER_WL_OBJEKT.title_en === "Report an issue"
);

assert(
  "bestaetigung no-mail hint",
  MIETER_WL_BESTAETIGUNG.status_hint_de.includes("keine Bestätigungs-E-Mail")
);
assert(
  "status title",
  MIETER_WL_STATUS.title_de === "Status Ihrer Meldung"
);

const footer = formatMieterWlFooterContact(
  { name: "Immobilien Steiner GmbH", tel: "030 555 12 00", mail: "a@b.de" },
  "de"
);
assert(
  "footer contact",
  footer ===
    "Bei Rückfragen erreichen Sie Immobilien Steiner GmbH · 030 555 12 00 · a@b.de."
);
assert(
  "footer noreply",
  mieterWlFooterNoreply("de") === MIETER_WL_FOOTER.noreply_de
);
assert(
  "logo letter",
  mieterWlLogoLetter({ name: "Immobilien Steiner", logoKuerzel: "IS" }) ===
    "IS"
);

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll portal2-mieter-wl checks passed.");
