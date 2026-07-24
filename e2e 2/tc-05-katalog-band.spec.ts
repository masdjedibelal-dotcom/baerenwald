import { test, expect } from "@playwright/test";

import { loadMusterContext } from "./fixtures/muster-context";
import { leadById } from "./helpers/db";
import { schwelleDirekt } from "./helpers/hv-flow";

test.describe("TC-05 Katalog Bandprodukt + m²-Automatik", () => {
  test.beforeEach(async ({ page }) => {
    const ctx = loadMusterContext();
    await page.goto(
      `/api/dev/auto-login?email=${encodeURIComponent(ctx.users.sachbearbeiterEmail)}&next=${encodeURIComponent("/portal")}`
    );
    await page.waitForURL(/\/portal/, { timeout: 60_000 });
  });

  test("GH12 mit m² — Preisberechnung + Angebotsrouting", async ({ page }) => {
    const ctx = loadMusterContext();
    const erwartet = 890 + ctx.wohnflaecheGH12 * 32;

    const res = await page.request.post("/api/org/katalog/bestellen", {
      data: {
        produktSlug: ctx.bandProduktSlug,
        kundeObjektId: ctx.objektGH12.id,
        einheitId: ctx.einheitGH12Id,
      },
    });
    expect(res.ok()).toBeTruthy();
    const json = (await res.json()) as { modus: string; betrag: number; leadId: string };
    expect(json.betrag).toBe(erwartet);
    expect(json.modus).toBe("angebot");
    expect(schwelleDirekt(erwartet)).toBe(false);

    const lead = await leadById(json.leadId);
    expect(lead?.preis_max).toBe(erwartet);
    expect(lead?.org_freigabe_status).toBe("ausstehend");
  });

  test("LS7 ohne m² — Angebotsweg erzwungen", async ({ page }) => {
    const ctx = loadMusterContext();
    const res = await page.request.post("/api/org/katalog/bestellen", {
      data: {
        produktSlug: ctx.bandProduktSlug,
        kundeObjektId: ctx.objektLS7.id,
      },
    });
    expect(res.ok()).toBeTruthy();
    const json = (await res.json()) as {
      modus: string;
      preisUnsicher: boolean;
      leadId: string;
    };
    expect(json.modus).toBe("angebot");
    expect(json.preisUnsicher).toBe(true);

    const lead = await leadById(json.leadId);
    expect(lead?.preis_unsicher).toBe(true);
    expect(lead?.preis_max).toBeFalsy();
  });

  test("Negativ: Band ohne m² nie direkt", async ({ page }) => {
    const ctx = loadMusterContext();
    const res = await page.request.post("/api/org/katalog/bestellen", {
      data: {
        produktSlug: ctx.bandProduktSlug,
        kundeObjektId: ctx.objektLS7.id,
      },
    });
    const json = (await res.json()) as { modus: string };
    expect(json.modus).not.toBe("direkt");
  });
});
