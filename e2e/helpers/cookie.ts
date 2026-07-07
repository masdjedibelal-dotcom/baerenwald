import type { Page } from "@playwright/test";

/** Cookie-Banner schließen, falls sichtbar. */
export async function dismissCookieBanner(page: Page) {
  const btn = page.getByRole("button", { name: /Nur notwendige|Akzeptieren/i }).first();
  if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await btn.click();
    await page.locator(".cookie-consent-banner").waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
  }
}
