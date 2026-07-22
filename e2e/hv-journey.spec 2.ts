import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import { loadE2EContext, uniqueMelderEmail } from "./helpers/context";
import { dismissCookieBanner } from "./helpers/cookie";
import { submitMeldeForm } from "./helpers/melde-flow";

test.describe("HV Journey — öffentlich @public", () => {
  test("Mieter: Meldung einreichen und Statusseite", async ({ page }) => {
    const ctx = loadE2EContext();
    const email = uniqueMelderEmail();
    const name = "E2E Test Mieter";

    await page.goto(`/melden/${ctx.orgKennung}/${ctx.objektSlug}`);
    await dismissCookieBanner(page);
    await expect(page.getByRole("heading", { name: /Schaden melden/i })).toBeVisible();
    await expect(page.getByText(ctx.objektTitel)).toBeVisible();

    await submitMeldeForm(page, {
      name,
      email,
      einheit: "EG links",
      beschreibung: "E2E-Test: Wasser tropft unter der Spüle, bitte prüfen.",
    });

    await expect(page.getByRole("heading", { name: /Danke/i })).toBeVisible();

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    expect(url && key).toBeTruthy();

    const admin = createClient(url!, key!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: lead } = await admin
      .from("leads")
      .select("id, melde_tracking_token")
      .eq("melder_email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    expect(lead?.melde_tracking_token).toBeTruthy();

    await page.goto(`/melden/status/${lead!.melde_tracking_token}`);
    await expect(page.getByText(/Status deiner Meldung/i)).toBeVisible();
    await expect(page.getByText(/Eingegangen/i)).toBeVisible();
  });
});

test.describe("HV Journey — Portal @org-portal", () => {
  test("Übersicht, Navigation und Leistungen", async ({ page }) => {
    await page.goto("/portal");
    await dismissCookieBanner(page);
    await expect(page.getByRole("main").getByText("Übersicht")).toBeVisible();
    await expect(page.getByText("Zur Freigabe")).toBeVisible();

    await page.getByRole("button", { name: "Vorgänge" }).click();
    await expect(page.getByRole("button", { name: /Zur Freigabe/i })).toBeVisible();

    await page.getByRole("button", { name: "Leistungen" }).click();
    await expect(page.getByText(/Übergabe|Leistungen/i).first()).toBeVisible();

    await page.getByRole("button", { name: "Einstellungen" }).click();
    await expect(page.getByRole("heading", { name: /Einstellungen|Profil/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Team" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Team" })).toHaveCount(0);
  });

  test("Vorgänge-Filter und Suche", async ({ page }) => {
    await page.goto("/portal?section=vorgaenge");
    await page.getByRole("button", { name: /Aktiv/i }).click();

    const search = page.getByPlaceholder("Vorgänge suchen");
    if (await search.isVisible()) {
      await search.fill("E2E");
      await page.waitForTimeout(500);
    }
  });

  test("Katalog: Angebot anfordern (Renovierung)", async ({ page }) => {
    await page.goto("/portal?section=leistungen");
    await dismissCookieBanner(page);
    await page.getByRole("button", { name: /Renovierung/i }).click();
    const angebotBtn = page.getByRole("button", { name: /Angebot anfordern/i }).first();
    if (await angebotBtn.isVisible()) {
      const [res] = await Promise.all([
        page.waitForResponse((r) => r.url().includes("/api/org/katalog/bestellen")),
        angebotBtn.click(),
      ]);
      const body = (await res.json()) as { error?: string };
      expect(res.ok(), body.error ?? res.status().toString()).toBeTruthy();
    }
  });
});
