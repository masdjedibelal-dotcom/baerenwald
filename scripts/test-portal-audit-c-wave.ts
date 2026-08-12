/**
 * Quick checks: C3/C4 helpers + layout tokens.
 */
import assert from "node:assert/strict";

import {
  countUnreadBautagebuch,
  hasUnreadBautagebuch,
  bautagebuchDeepLink,
} from "../src/lib/portal2/bautagebuch-attention";
import { resolveHvWartetAufHw } from "../src/lib/portal2/hv-wartet-auf-hw";
import { hvKpiToListeFilter } from "../src/lib/portal2/hv-liste";
import {
  portalListStackClass,
  PORTAL_DETAIL_SECTION_IDS,
} from "../src/lib/portal2/layout-chrome";

assert.equal(countUnreadBautagebuch([], null), 0);
assert.equal(
  countUnreadBautagebuch(
    [{ created_at: "2026-07-01T10:00:00Z" }, { created_at: "2026-07-02T10:00:00Z" }],
    "2026-07-01T12:00:00Z"
  ),
  1
);
assert.equal(
  hasUnreadBautagebuch([{ created_at: "2026-07-02T10:00:00Z" }], null),
  true
);
assert.ok(bautagebuchDeepLink("abc-123").includes("#bautagebuch"));

assert.equal(
  resolveHvWartetAufHw({
    positionen: [{ handwerker_status: "angefragt" }],
  })?.label,
  "Wartet auf HW · Antwort"
);
assert.equal(
  resolveHvWartetAufHw({ bautagebuchAnfrageOffen: true })?.kind,
  "bautagebuch"
);
assert.equal(resolveHvWartetAufHw({}), null);

assert.equal(hvKpiToListeFilter("wartet_freigabe"), "offen");
assert.equal(hvKpiToListeFilter("in_arbeit"), "in_arbeit");
assert.ok(portalListStackClass("responsive").includes("lg:"));
assert.equal(PORTAL_DETAIL_SECTION_IDS.length, 5);

console.log("audit C3/C4/layout checks passed.");
