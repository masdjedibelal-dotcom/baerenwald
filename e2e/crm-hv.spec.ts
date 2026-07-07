import { readFileSync, existsSync } from "fs";
import path from "path";

import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

function resolveLeadId(): string | null {
  const fromEnv = process.env.E2E_CRM_LEAD_ID?.trim();
  if (fromEnv) return fromEnv;

  const cache = path.join(__dirname, ".cache/test-context.json");
  if (!existsSync(cache)) return null;

  try {
    const ctx = JSON.parse(readFileSync(cache, "utf8")) as { orgKundeId?: string };
    if (!ctx.orgKundeId) return null;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;

    return null;
  } catch {
    return null;
  }
}

test.describe("CRM HV-Spiegelung", () => {
  test("Anfragen-Liste lädt", async ({ page }) => {
    await page.goto("/anfragen");
    await expect(
      page.getByText(/Anfragen|Leads|Eingang/i).first()
    ).toBeVisible({ timeout: 30_000 });
  });

  test("Lead-Detail mit HV-Kontext", async ({ page }) => {
    let leadId = resolveLeadId();

    if (!leadId) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
      if (url && key) {
        const admin = createClient(url, key, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const cache = path.join(__dirname, ".cache/test-context.json");
        if (existsSync(cache)) {
          const ctx = JSON.parse(readFileSync(cache, "utf8")) as { orgKundeId?: string };
          if (ctx.orgKundeId) {
            const { data } = await admin
              .from("leads")
              .select("id")
              .eq("auftraggeber_kunde_id", ctx.orgKundeId)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            leadId = data?.id ?? null;
          }
        }
      }
    }

    test.skip(!leadId, "Kein Lead für HV-Organisation gefunden");

    await page.goto(`/anfragen/${leadId}`);
    await expect(
      page.getByText(/Auftraggeber-Kontext|Melder|Organisation|Meldung/i).first()
    ).toBeVisible({ timeout: 30_000 });
  });
});
