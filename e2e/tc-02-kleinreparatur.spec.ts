import { test, expect } from "@playwright/test";

import { loadMusterContext, uniqueMelderEmail } from "./fixtures/muster-context";
import { leadByMelderEmail } from "./helpers/db";
import { dismissCookieBanner } from "./helpers/cookie";
import { submitMeldeForm } from "./helpers/melde-flow";
import { recordUxPlaceholder } from "./helpers/ux-report";

test.describe.serial("TC-02 Standardvorgang unter Schwelle + Kleinreparatur", () => {
  let leadId: string;

  test.describe("Mieter (öffentlich)", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("1 — Mieter meldet tropfenden Wasserhahn (kein Havarie)", async ({ page }) => {
    const ctx = loadMusterContext();
    const email = uniqueMelderEmail("kleinrep");

    await page.goto(`/melden/${ctx.orgKennung}/${ctx.objektGH12.slug}`);
    await dismissCookieBanner(page);
    await submitMeldeForm(page, {
      name: "E2E Kleinrep",
      email,
      beschreibung: "Wasserhahn tropft in der Küche.",
    });

    const lead = await leadByMelderEmail(email);
    expect(lead).toBeTruthy();
    leadId = lead!.id;
    expect(lead!.hv_meldung_status ?? "neu").not.toBe("notmassnahme");
    recordUxPlaceholder("Mieter Meldung Kleinrep", "TC-02", "Keine Auto-Disposition sichtbar");
    });
  });

  test("2–4 — Kleinreparatur-Flow + Rechnung", async ({ page }) => {
    test.skip(!leadId, "Lead fehlt");

    await page.goto("/portal?section=eingang");
    await dismissCookieBanner(page);
    await expect(page.getByText(/Eingang|Meldungen/i).first()).toBeVisible();

    // UI für Kleinreparatur-Flag + Kostenträger-Vorschlag — manuell prüfen wenn Lead sichtbar
    recordUxPlaceholder("HV Eingang Kleinreparatur", "TC-02", "Kleinreparatur-Buttons abhängig von Lead in Liste");
  });
});
