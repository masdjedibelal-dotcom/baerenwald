import { chromium, type Browser } from "playwright";
import path from "path";

const PASSWORD =
  process.env.E2E_ORG_PASSWORD?.trim() ||
  process.env.E2E_DEFAULT_PASSWORD?.trim() ||
  "E2eTestPass2026!";

export async function loginAsEmail(
  browser: Browser,
  baseUrl: string,
  email: string,
  next: string
) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(
    `${baseUrl}/api/dev/auto-login?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`
  );
  await page.waitForURL(new RegExp(next.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), {
    timeout: 60_000,
  });
  return context;
}

export async function saveAuthState(
  baseUrl: string,
  email: string,
  next: string,
  outPath: string
) {
  const browser = await chromium.launch();
  const ctx = await loginAsEmail(browser, baseUrl, email, next);
  await ctx.storageState({ path: outPath });
  await browser.close();
}

export { PASSWORD as e2ePassword };
