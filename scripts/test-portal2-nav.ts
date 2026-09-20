/**
 * Portal 2.0 B2 — navItems() Labels/Keys (N4/N8).
 */
import {
  PORTAL_NAV_FAMILY_LABELS,
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
  "kein mieter in PORTAL_NAV_ITEMS",
  !Object.prototype.hasOwnProperty.call(PORTAL_NAV_ITEMS, "mieter")
);

assert(
  "kunde_hv labels",
  getPortalNavItems("kunde_hv")
    .map((i) => i.label)
    .join(" · ") ===
    "Übersicht · Vorgänge · Objekte · Serviceabos · Marktplatz · Einstellungen"
);
assert(
  "kunde_privat labels",
  getPortalNavItems("kunde_privat")
    .map((i) => i.label)
    .join(" · ") === "Übersicht · Vorgänge · Einstellungen"
);
assert(
  "eigentuemer labels",
  getPortalNavItems("eigentuemer")
    .map((i) => i.label)
    .join(" · ") === "Übersicht · Vorgänge · Objekte"
);
assert(
  "hausmeister labels = eigentuemer",
  getPortalNavItems("hausmeister")
    .map((i) => i.label)
    .join(" · ") ===
    getPortalNavItems("eigentuemer")
      .map((i) => i.label)
      .join(" · ")
);
assert(
  "handwerker labels",
  getPortalNavItems("handwerker")
    .map((i) => i.label)
    .join(" · ") === "Übersicht · Vorgänge · Einstellungen"
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
assert("org label Übersicht", orgNav[0]!.label === PORTAL_NAV_FAMILY_LABELS.home);
assert("org badge on liste", orgNav[1]!.badge === 3);
assert("org label Serviceabos", orgNav[3]!.label === "Serviceabos");
assert("org label Einstellungen", orgNav[5]!.label === "Einstellungen");
assert("org ohne Team-Nav", orgNav.every((i) => i.id !== "team"));

const partnerNav = buildPortalShellNav("handwerker", "partner");
assert("partner 3 items", partnerNav.length === 3);
assert("partner Übersicht", partnerNav[0]!.label === "Übersicht");
assert("partner Vorgänge", partnerNav[1]!.label === "Vorgänge");
assert("partner Einstellungen", partnerNav[2]!.label === "Einstellungen");

const eigNav = buildPortalShellNav("eigentuemer", "eigentuemer");
assert("eigentuemer section map", eigNav.length === 3);
assert("eigentuemer home", eigNav[0]!.id === "uebersicht");
assert("eigentuemer liste", eigNav[1]!.id === "vorgaenge");
assert("eigentuemer objekte", eigNav[2]!.id === "objekte");
assert("eigentuemer Objekte-Label", eigNav[2]!.label === "Objekte");

const hmNav = buildPortalShellNav("hausmeister", "hausmeister");
assert("hausmeister section map", hmNav.length === 3);
assert("hausmeister objekte", hmNav[2]!.id === "objekte");

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll portal2-nav checks passed.");
