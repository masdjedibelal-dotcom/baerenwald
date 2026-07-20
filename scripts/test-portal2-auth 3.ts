/**
 * Portal 2.0 TEIL F — Auth helpers.
 */
import {
  AUTH_ADMIN_VIEW_END,
  AUTH_ADMIN_VIEW_PREFIX,
  AUTH_BRAND_TAGLINE_BW,
  AUTH_BRAND_TAGLINE_WL,
  AUTH_CONFIRM,
  AUTH_LOGIN,
  authBrandName,
  authWL,
  resolveAuthRoleFromPath,
} from "../src/lib/portal2/auth";

let failed = 0;
function assert(name: string, ok: boolean) {
  if (!ok) {
    failed++;
    console.error(`  ✗ ${name}`);
  } else {
    console.log(`  ✓ ${name}`);
  }
}

console.log("portal2 TEIL F auth");

assert("wl mieter", authWL("mieter"));
assert("wl eigentuemer", authWL("eigentuemer"));
assert("not wl kunde", !authWL("kunde"));
assert("not wl hw", !authWL("handwerker"));

assert("brand bw", authBrandName("kunde") === "Bärenwald");
assert(
  "brand wl org",
  authBrandName("mieter", "Steiner GmbH") === "Steiner GmbH"
);
assert(
  "brand wl fallback",
  authBrandName("eigentuemer") === "Hausverwaltung"
);

assert("login title", AUTH_LOGIN.title === "Willkommen zurück");
assert(
  "login sub",
  AUTH_LOGIN.subtitle("Bärenwald").includes("Bärenwald")
);
assert("tagline bw", AUTH_BRAND_TAGLINE_BW.includes("Vorgänge"));
assert("tagline wl", AUTH_BRAND_TAGLINE_WL.includes("Anliegen"));

assert("confirm magic", AUTH_CONFIRM.magicSent.title === "Link gesendet");
assert("confirm forgot", AUTH_CONFIRM.forgotSent.title === "E-Mail unterwegs");
assert(
  "confirm invite",
  AUTH_CONFIRM.inviteDone.body("X").includes("X")
);

assert(
  "role path partner",
  resolveAuthRoleFromPath("/partner/login") === "handwerker"
);
assert(
  "role query mieter",
  resolveAuthRoleFromPath("/portal/login", "mieter") === "mieter"
);
assert(
  "admin banner",
  AUTH_ADMIN_VIEW_PREFIX.includes("Admin-Ansicht") &&
    AUTH_ADMIN_VIEW_END === "Beenden"
);

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll portal2-auth checks passed.");
