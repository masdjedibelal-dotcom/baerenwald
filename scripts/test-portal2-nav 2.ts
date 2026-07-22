/**
 * Portal 2.0 B2 — navItems() Labels/Keys 1:1.
 */
import {
  PORTAL_NAV_ITEMS,
  buildPortalShellNav,
  getPortalNavItems,
} from "../src/lib/portal2/nav-items";

let failed = 0;
function assert(name: string, ok: boolean) {
  if (!ok) {
    failed++;
    console.error(`  ✗ ${name}`);
  } else {
    console.log(`  ✓ ${name}`);
  }
}

console.log("portal2 B2 nav-items");

assert(
  "kunde_hv labels",
  getPortalNavItems("kunde_hv")
    .map((i) => i.label)
    .join(" · ") ===
    "Dashboard · Vorgänge · Objekte · Servicepakete · Team · Einstellungen"
);
assert(
  "kunde_privat labels",
  getPortalNavItems("kunde_privat")
    .map((i) => i.label)
    .join(" · ") === "Übersicht · Meine Aufträge · Einstellungen"
);
assert(
  "eigentuemer labels",
  getPortalNavItems("eigentuemer")
    .map((i) => i.label)
    .join(" · ") === "Dashboard · Vorgänge · Objekte"
);
assert(
  "mieter labels",
  getPortalNavItems("mieter")
    .map((i) => i.label)
    .join(" · ") === "Start · Meine Meldungen · Konto"
);
assert(
  "handwerker labels (Mock inkl. Firmendaten)",
  getPortalNavItems("handwerker")
    .map((i) => i.label)
    .join(" · ") === "Start · Aufträge · Firmendaten"
);

assert(
  "glyphs home",
  PORTAL_NAV_ITEMS.kunde_hv[0]!.glyph === "◈" &&
    PORTAL_NAV_ITEMS.kunde_hv[1]!.glyph === "▤"
);

const orgNav = buildPortalShellNav("kunde_hv", "org", { liste: 3 });
assert("org section map home", orgNav[0]!.id === "uebersicht");
assert("org section map liste", orgNav[1]!.id === "vorgaenge");
assert("org section map servicepakete", orgNav[3]!.id === "leistungen");
assert("org section map team", orgNav[4]!.id === "team");
assert("org section map settings", orgNav[5]!.id === "profil");
assert("org badge on liste", orgNav[1]!.badge === 3);
assert("org label Servicepakete", orgNav[3]!.label === "Servicepakete");
assert("org label Team", orgNav[4]!.label === "Team");

const partnerNav = buildPortalShellNav("handwerker", "partner");
assert("partner 3 items", partnerNav.length === 3);
assert("partner Aufträge", partnerNav[1]!.label === "Aufträge");

const eigNav = buildPortalShellNav("eigentuemer", "eigentuemer");
assert("eigentuemer section map", eigNav.length === 3);
assert("eigentuemer home", eigNav[0]!.id === "uebersicht");
assert("eigentuemer liste", eigNav[1]!.id === "vorgaenge");
assert("eigentuemer objekte", eigNav[2]!.id === "objekte");

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll portal2-nav checks passed.");
