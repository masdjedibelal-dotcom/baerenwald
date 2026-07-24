import {
  orgWhitelabelGateCanComplete,
  orgWhitelabelGateDaysRemaining,
  orgWhitelabelGateHardEnforced,
  orgWhitelabelGateVisible,
  ORG_WL_ANSRACHE_FALLBACK,
  ORG_WL_GATE_GRACE_DAYS,
} from "@/lib/org/org-whitelabel-gate";
import { orgWhitelabelReady } from "@/lib/org/org-mieter-kontakt";
import { getOrgAvTextForVersion } from "@/lib/org/org-av-text";

let failed = 0;

function assert(name: string, ok: boolean) {
  if (!ok) {
    failed++;
    console.error(`  ✗ ${name}`);
  } else {
    console.log(`  ✓ ${name}`);
  }
}

const readyOrg = {
  av_akzeptiert_am: "2026-07-01T00:00:00Z",
  av_version: "2026-07",
  mieter_kontakt_telefon: "+491234",
  wl_ansprache_am: ORG_WL_ANSRACHE_FALLBACK,
};

assert("ready org: gate hidden", !orgWhitelabelGateVisible(readyOrg, "admin"));
assert("ready org: not hard enforced irrelevant", !orgWhitelabelReady({ ...readyOrg, av_akzeptiert_am: null }));

const incomplete = {
  av_akzeptiert_am: null,
  av_version: null,
  mieter_kontakt_telefon: null,
  mieter_kontakt_email: null,
  wl_ansprache_am: ORG_WL_ANSRACHE_FALLBACK,
};

const graceNow = new Date("2026-07-20T00:00:00+02:00");
assert(
  "grace: admin sees gate",
  orgWhitelabelGateVisible(incomplete, "admin", graceNow) &&
    !orgWhitelabelGateHardEnforced(incomplete, graceNow)
);
assert(
  "grace: sachbearbeiter no gate",
  !orgWhitelabelGateVisible(incomplete, "sachbearbeiter", graceNow)
);
assert(
  "grace: days remaining > 0",
  orgWhitelabelGateDaysRemaining(incomplete, graceNow) > 0
);

const hardNow = new Date("2026-08-15T00:00:00+02:00");
assert(
  "hard: enforced after 30d",
  orgWhitelabelGateHardEnforced(incomplete, hardNow)
);
assert(
  "hard: all roles see gate",
  orgWhitelabelGateVisible(incomplete, "sachbearbeiter", hardNow) &&
    orgWhitelabelGateVisible(incomplete, "admin", hardNow)
);
assert(
  "hard: only admin completes",
  orgWhitelabelGateCanComplete("admin") && !orgWhitelabelGateCanComplete("sachbearbeiter")
);

assert(
  "av text non-empty",
  getOrgAvTextForVersion("2026-07").includes("Art. 28")
);

assert(
  "grace days constant",
  ORG_WL_GATE_GRACE_DAYS === 30
);

if (failed) {
  console.error(`\n${failed} gate test(s) failed`);
  process.exit(1);
}
console.log("\nAll org whitelabel gate tests passed.");
