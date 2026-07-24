import { test, expect } from "@playwright/test";

import { loadMusterContext } from "./fixtures/muster-context";
import { leadById } from "./helpers/db";

test.describe("TC-03 Manuell erstellter Vorgang (HV-initiiert)", () => {
  test("HV legt Vorgang ohne Mieter an", async ({ page }) => {
    const ctx = loadMusterContext();
    await page.goto(
      `/api/dev/auto-login?email=${encodeURIComponent(ctx.users.sachbearbeiterEmail)}&next=${encodeURIComponent("/portal")}`
    );
    await page.waitForURL(/\/portal/, { timeout: 60_000 });

    const res = await page.request.post("/api/org/vorgang-manuell", {
      data: {
        titel: "E2E Gemeinschaftsreparatur Flur",
        beschreibung: "Fliesen im EG-Flur lose — Kostenträger Gemeinschaft.",
        kundeObjektId: ctx.objektGH12.id,
        kostentraeger: "gemeinschaft",
        preisNetto: 800,
      },
    });
    expect(res.ok()).toBeTruthy();
    const json = (await res.json()) as { leadId: string; hasMieterStatusLink: boolean };
    expect(json.leadId).toBeTruthy();
    expect(json.hasMieterStatusLink).toBe(false);

    const lead = await leadById(json.leadId);
    expect(lead?.kanal).toBe("hv_manuell");
    expect(lead?.melde_tracking_token).toBeFalsy();
    expect(lead?.kostentraeger).toBe("gemeinschaft");
    expect(lead?.melder_email).toBeFalsy();
  });
});
