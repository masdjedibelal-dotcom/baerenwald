/**
 * Portal 2.0 B5 — roleBadge + portalHeader Initialen.
 */
import {
  getPortalRoleBadge,
  portalHeaderInitials,
  PORTAL_ROLE_BADGE,
  toPortalRoleBadgeRole,
} from "../src/lib/portal2/role-badge";

let failed = 0;
function assert(name: string, ok: boolean) {
  if (!ok) {
    failed++;
    console.error(`  ✗ ${name}`);
  } else {
    console.log(`  ✓ ${name}`);
  }
}

console.log("portal2 B5 role-badge / portalHeader");

assert("mieter label", PORTAL_ROLE_BADGE.mieter.label === "Mieter");
assert("mieter bg", PORTAL_ROLE_BADGE.mieter.bg === "#E4ECF7");
assert("mieter color", PORTAL_ROLE_BADGE.mieter.color === "#1F4FA8");

assert("kunde label", PORTAL_ROLE_BADGE.kunde.label === "Kunde");
assert("kunde bg", PORTAL_ROLE_BADGE.kunde.bg === "#E7F1E9");
assert("kunde color", PORTAL_ROLE_BADGE.kunde.color === "#2E7D52");

assert("eigentuemer label", PORTAL_ROLE_BADGE.eigentuemer.label === "Eigentümer");
assert("eigentuemer bg", PORTAL_ROLE_BADGE.eigentuemer.bg === "#EDE7F6");
assert("eigentuemer color", PORTAL_ROLE_BADGE.eigentuemer.color === "#5B3FA8");

assert("handwerker label", PORTAL_ROLE_BADGE.handwerker.label === "Handwerker");
assert("handwerker bg", PORTAL_ROLE_BADGE.handwerker.bg === "#FBF1D6");
assert("handwerker color", PORTAL_ROLE_BADGE.handwerker.color === "#8A5A06");

assert("map kunde_hv → kunde", toPortalRoleBadgeRole("kunde_hv") === "kunde");
assert(
  "map kunde_privat → kunde",
  toPortalRoleBadgeRole("kunde_privat") === "kunde"
);
assert("map unknown → mieter", toPortalRoleBadgeRole("xyz") === "mieter");

assert(
  "getPortalRoleBadge kunde_hv",
  getPortalRoleBadge("kunde_hv").label === "Kunde"
);

assert(
  "initials Steiner GmbH",
  portalHeaderInitials("Steiner GmbH") === "SG"
);
assert(
  "initials H. Berger",
  portalHeaderInitials("H. Berger") === "HB"
);
assert(
  "initials Sanitär Nord",
  portalHeaderInitials("Sanitär Nord") === "SN"
);
assert("initials empty", portalHeaderInitials("  ") === "?");

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll portal2-header checks passed.");
