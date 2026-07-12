import { expect, test } from "@playwright/test";

test.describe("Partner-Portal (Auth-Bypass)", () => {
  test("Partner-Dashboard lädt", async ({ page }) => {
    await page.goto("/partner");
    await expect(page.getByText(/Vorgänge|Aufträge|Partner/i).first()).toBeVisible({
      timeout: 30_000,
    });
  });
});
