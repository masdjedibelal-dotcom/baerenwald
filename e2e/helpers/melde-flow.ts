import type { Page } from "@playwright/test";

import { dismissCookieBanner } from "./cookie";

/** Meldeformular durch alle Schritte bis Absenden. */
export async function submitMeldeForm(
  page: Page,
  opts: {
    name: string;
    email: string;
    einheit?: string;
    beschreibung: string;
    kategorie?: "notfall" | "schaden" | "reparatur" | "sonstiges";
  }
) {
  await dismissCookieBanner(page);

  if (opts.kategorie) {
    const labels: Record<string, RegExp> = {
      notfall: /Notfall/i,
      schaden: /Schaden/i,
      reparatur: /Reparatur/i,
      sonstiges: /Sonstiges/i,
    };
    await page.getByRole("button", { name: labels[opts.kategorie] }).click();
  }

  await page.getByRole("button", { name: "Weiter" }).first().click();

  await page.getByRole("button", { name: /Wasser \/ Rohr/i }).click();
  await page.getByRole("button", { name: "Weiter" }).click();

  for (let step = 0; step < 6; step++) {
    if (await page.locator("#melder-text").isVisible().catch(() => false)) break;

    const fields = page.locator(".melden-field");
    const fieldCount = await fields.count();
    for (let i = 0; i < fieldCount; i++) {
      const btn = fields.nth(i).locator("button.melden-kategorie-btn").first();
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
      }
    }

    const weiter = page.getByRole("button", { name: "Weiter" });
    if (await weiter.isVisible().catch(() => false)) {
      await weiter.click();
    } else {
      break;
    }
  }

  await page.locator("#melder-text").waitFor({ state: "visible", timeout: 20_000 });
  await page.locator("#melder-text").fill(opts.beschreibung);
  await page.getByRole("button", { name: "Weiter" }).click();

  await page.locator("#melder-name").waitFor({ state: "visible" });
  await page.locator("#melder-name").fill(opts.name);
  await page.locator("#melder-email").fill(opts.email);
  if (opts.einheit) {
    await page.locator("#melder-einheit").fill(opts.einheit);
  }

  await page.getByRole("button", { name: /Meldung absenden/i }).click();
  await page.waitForURL(/\/melden\/bestaetigung/, { timeout: 30_000 });
}
