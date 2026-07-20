/**
 * Portal 2.0 E4 — Einladungs-Token Helpers.
 */
import {
  buildPortalEinladungMailto,
  buildPortalEinladungUrl,
  createPortalEinladungToken,
  isPortalEinladungExpired,
  portalEinladungExpiresAt,
  PORTAL_EINLADUNG_EXPIRES_DAYS,
  resolvePortalEinladungStatus,
} from "../src/lib/portal2/portal-einladungen";

let failed = 0;
function assert(name: string, ok: boolean) {
  if (!ok) {
    failed++;
    console.error(`  ✗ ${name}`);
  } else {
    console.log(`  ✓ ${name}`);
  }
}

console.log("portal2 E4 portal-einladungen");

const token = createPortalEinladungToken();
assert("token length", token.length >= 20);
assert("token url-safe", !/[+/]/.test(token));

const url = buildPortalEinladungUrl(token);
assert("url path", url.includes("/portal/einladung/"));
assert("url has token", url.includes(encodeURIComponent(token)) || url.includes(token));

assert("expires days", PORTAL_EINLADUNG_EXPIRES_DAYS === 30);
const exp = portalEinladungExpiresAt(new Date("2026-01-01T00:00:00Z"));
assert("expires future", exp.getTime() > new Date("2026-01-01T00:00:00Z").getTime());

assert(
  "not expired null",
  !isPortalEinladungExpired(null, new Date("2026-06-01"))
);
assert(
  "expired",
  isPortalEinladungExpired("2026-01-01T00:00:00Z", new Date("2026-06-01"))
);

assert(
  "status offen",
  resolvePortalEinladungStatus({
    status: "offen",
    expires_at: "2099-01-01T00:00:00Z",
  }) === "offen"
);
assert(
  "status abgelaufen via date",
  resolvePortalEinladungStatus({
    status: "offen",
    expires_at: "2020-01-01T00:00:00Z",
  }) === "abgelaufen"
);

const mail = buildPortalEinladungMailto({
  link: "https://example.com/portal/einladung/abc",
  hvName: "Steiner GmbH",
  objektLabel: "Parkallee 9",
  einheitRef: "WE 1",
});
assert("mailto scheme", mail.startsWith("mailto:?"));
assert("mailto hv branding", mail.includes(encodeURIComponent("Steiner GmbH")));
assert("mailto no baerenwald sender", !mail.toLowerCase().includes("baerenwald@"));

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll portal2-einladungen checks passed.");
