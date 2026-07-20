import { test, expect } from "@playwright/test";

import { loadMusterContext } from "./fixtures/muster-context";
import { leadById } from "./helpers/db";
import { recordUxPlaceholder } from "./helpers/ux-report";

/**
 * TC-09 — Regression Bestandsgeschäft (Baseline vor HV-Flows).
 * Privater Endkunden-Lead ohne Kostenträger, HV-Freigabe, Organisation.
 */
test.describe("TC-09 Regression Bestandsgeschäft", () => {
  test("Bestands-Lead ohne HV-Pflichtfelder (DB)", async () => {
    const ctx = loadMusterContext();
    const lead = await leadById(ctx.bestandsLeadId);
    expect(lead).toBeTruthy();
    expect(lead!.kostentraeger ?? null).toBeNull();
    expect(lead!.auftraggeber_kunde_id ?? null).toBeNull();
    const freigabe = lead!.org_freigabe_status ?? null;
    expect(freigabe === null || freigabe === "nicht_noetig").toBe(true);
  });

  test("CRM: Bestands-Lead-Detail lädt", { tag: "@crm" }, async ({ page }) => {
    const ctx = loadMusterContext();
    test.skip(!process.env.E2E_CRM_BASE_URL?.trim(), "E2E_CRM_BASE_URL nicht gesetzt");

    await page.goto(`/anfragen/${ctx.bestandsLeadId}`);
    await expect(page.getByText(/Anfrage|Lead|Eingang/i).first()).toBeVisible({
      timeout: 30_000,
    });

    const ktPflicht = page.getByText(/Kostenträger.*Pflicht/i);
    await expect(ktPflicht).toHaveCount(0);

    recordUxPlaceholder("CRM Lead-Detail Bestand", "TC-09", "Privat-Lead lädt ohne HV-Pflichtfelder");
  });
});
