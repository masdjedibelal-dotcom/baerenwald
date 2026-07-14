import { createClient } from "@supabase/supabase-js";
import { test, expect } from "@playwright/test";

import { readFileSync } from "fs";
import path from "path";

import { loadMusterContext } from "./fixtures/muster-context";
import { leadByMelderEmail } from "./helpers/db";
import { uniqueMelderEmail } from "./fixtures/muster-context";
import { dismissCookieBanner } from "./helpers/cookie";
import { submitMeldeForm } from "./helpers/melde-flow";
import {
  assertNoProdBypassInCurrentEnv,
  crmDevBypassWouldEnable,
  portalBypassWouldEnable,
} from "./helpers/dev-bypass-guards";

test.describe("TC-08 RLS / Sicherheit (Negativtests)", () => {
  test.describe("Mieter (öffentlich)", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("HV-B sieht fremden Vorgang nicht", async ({ page }) => {
    const ctx = loadMusterContext();
    const email = uniqueMelderEmail("rls");
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    await page.goto(`/melden/${ctx.orgKennung}/${ctx.objektGH12.slug}`);
    await dismissCookieBanner(page);
    await submitMeldeForm(page, {
      name: "RLS Test",
      email,
      beschreibung: "RLS Negativtest",
    });

    const lead = await leadByMelderEmail(email);
    expect(lead?.id).toBeTruthy();

    const hvBEmail = "e2e-muster-hvb@baerenwald-test.local";
    await page.goto(
      `/api/dev/auto-login?email=${encodeURIComponent(hvBEmail)}&next=${encodeURIComponent("/portal?section=vorgaenge")}`
    );
    await page.waitForURL(/\/portal/, { timeout: 60_000 });

    // Fremder Lead darf in HV-B-Portal nicht als Detail aufrufbar sein
    const res = await page.request.get(`/api/org/leads/${lead!.id}`);
    expect([403, 404]).toContain(res.status());
    });
  });

  test("RLS blockiert Insert auf fremde Organisation", async () => {
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { error } = await anon.from("leads").insert({
      kunde_id: "00000000-0000-0000-0000-000000000001",
      kanal: "website",
      status: "neu",
    });

    expect(error).toBeTruthy();
  });

  test("TEST_AUTH_BYPASS in Production-Build bricht", async () => {
    assertNoProdBypassInCurrentEnv("TEST_AUTH_BYPASS");
    expect(portalBypassWouldEnable("production", "true")).toBe(false);
    expect(portalBypassWouldEnable("development", "true")).toBe(true);
    expect(portalBypassWouldEnable("development", undefined)).toBe(false);
  });

  test("CRM_DEV_SKIP_AUTH in Production-Build bricht", async () => {
    assertNoProdBypassInCurrentEnv("CRM_DEV_SKIP_AUTH");
    expect(crmDevBypassWouldEnable("production", "true")).toBe(false);
    expect(crmDevBypassWouldEnable("development", "true")).toBe(true);
    expect(crmDevBypassWouldEnable("development", undefined)).toBe(false);
  });

  test("CRM /api/dev/* — Production-Guard im Quellcode", () => {
    const crmRoot = path.join(
      __dirname,
      "../../../Bärenwald-Backend/baerenwald-crm-dashboard"
    );
    const hvAction = readFileSync(
      path.join(crmRoot, "src/app/api/dev/hv-action/route.ts"),
      "utf8"
    );
    const autoLogin = readFileSync(
      path.join(crmRoot, "src/app/api/dev/auto-login/route.ts"),
      "utf8"
    );
    const devAuth = readFileSync(path.join(crmRoot, "src/lib/dev-auth.ts"), "utf8");

    expect(devAuth).toMatch(/NODE_ENV\s*!==\s*['"]production['"]/);
    expect(hvAction).toContain("isDevAuthSkipEnabled");
    expect(hvAction).toMatch(/NODE_ENV\s*===\s*['"]production['"]/);
    expect(autoLogin).toMatch(/NODE_ENV\s*===\s*['"]production['"]/);
    expect(autoLogin).toContain("isDevAuthSkipEnabled");
  });
});
