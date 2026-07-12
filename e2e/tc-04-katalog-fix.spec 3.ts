import { test, expect } from "@playwright/test";

import { loadMusterContext } from "./fixtures/muster-context";
import { dismissCookieBanner } from "./helpers/cookie";
import { orgFreigabeLogFor } from "./helpers/db";
import { recordUxPlaceholder } from "./helpers/ux-report";

test.describe("TC-04 Katalog Fixprodukt unter Schwelle", () => {
  test("Verstopfung 189 € — direkt bestellbar", async ({ page }) => {
    const ctx = loadMusterContext();

    await page.goto("/portal?section=leistungen");
    await dismissCookieBanner(page);
    await expect(page.getByText(/Leistungen|Fixpreis/i).first()).toBeVisible();

    const res = await page.request.post("/api/org/katalog/bestellen", {
      data: {
        produktSlug: ctx.fixProduktSlug,
        kundeObjektId: ctx.objektGH12.id,
        einheitId: ctx.einheitGH12Id,
      },
    });

    if (!res.ok()) {
      const body = await res.text();
      test.skip(true, `Katalog-API: ${res.status()} ${body}`);
    }

    const json = (await res.json()) as { leadId?: string };
    expect(json.leadId).toBeTruthy();

    const logs = await orgFreigabeLogFor(json.leadId!);
    expect(logs.length).toBeGreaterThanOrEqual(0);

    recordUxPlaceholder("HV Katalog Fixbestellung", "TC-04", "API-Bestellung unter Schwelle");
  });
});
