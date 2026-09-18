/**
 * Portal 2.0 D8 — Eigentümer-Rolle (Status-only: neu / updates / abgeschlossen).
 */
import { filterLeadsByEigentuemerObjekte } from "../src/lib/portal2/eigentuemer";
import { buildPortalShellNav, getPortalNavItems } from "../src/lib/portal2/nav-items";
import {
  formatPortalNotifTemplate,
  PORTAL_NOTIF_ROLE_TITLES,
  PORTAL_NOTIF_TEMPLATES,
} from "../src/lib/portal2/notif-types";
import { resolveEigentuemerVorgangBetrag } from "../src/lib/portal/get-eigentuemer-portal-data";

let failed = 0;
function assert(name: string, ok: boolean) {
  if (!ok) {
    failed++;
    console.error(`  ✗ ${name}`);
  } else {
    console.log(`  ✓ ${name}`);
  }
}

console.log("portal2 D8 eigentuemer");

assert(
  "nav labels",
  getPortalNavItems("eigentuemer")
    .map((i) => i.label)
    .join(" · ") === "Dashboard · Vorgänge · Objekte"
);

const shell = buildPortalShellNav("eigentuemer", "eigentuemer");
assert("shell 3 items", shell.length === 3);
assert("shell objekte", shell[2]!.id === "objekte" && shell[2]!.label === "Objekte");

assert(
  "role titles status-only",
  PORTAL_NOTIF_ROLE_TITLES.eigentuemer?.auftrag === "Neuer Vorgang" &&
    PORTAL_NOTIF_ROLE_TITLES.eigentuemer?.info === "Update zu Ihrem Objekt" &&
    PORTAL_NOTIF_ROLE_TITLES.eigentuemer?.status === "Vorgang abgeschlossen"
);

assert(
  "template neu",
  formatPortalNotifTemplate(PORTAL_NOTIF_TEMPLATES.eigentuemer.auftrag, {
    titel: "Wasserschaden",
  }) === 'Neuer Vorgang „Wasserschaden" an Ihrem Objekt.'
);
assert(
  "template update",
  formatPortalNotifTemplate(PORTAL_NOTIF_TEMPLATES.eigentuemer.info, {
    titel: "Wasserschaden",
  }) === 'Update zu „Wasserschaden".'
);
assert(
  "template abgeschlossen",
  formatPortalNotifTemplate(PORTAL_NOTIF_TEMPLATES.eigentuemer.status, {
    titel: "Wasserschaden",
  }) === '„Wasserschaden" wurde abgeschlossen.'
);

const filtered = filterLeadsByEigentuemerObjekte(
  [
    { id: "1", kunde_objekt_id: "o1" },
    { id: "2", kunde_objekt_id: "o2" },
    { id: "3", kunde_objekt_id: null },
  ],
  ["o1"]
);
assert("listFor filter", filtered.length === 1 && filtered[0]!.id === "1");
assert(
  "listFor empty zuordnung",
  filterLeadsByEigentuemerObjekte(
    [{ id: "1", kunde_objekt_id: "o1" }],
    []
  ).length === 0
);

assert(
  "betrag max",
  resolveEigentuemerVorgangBetrag({
    angebotBrutto: 600,
    preisMax: 400,
  }) === 600
);

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll portal2-eigentuemer checks passed.");
