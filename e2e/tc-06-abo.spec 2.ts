import { test, expect } from "@playwright/test";

import { loadMusterContext } from "./fixtures/muster-context";
import { adminClient, auditEventsFor } from "./helpers/db";

function naechsterMonatsanfang(): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

test.describe("TC-06 Abo-Lebenszyklus", () => {
  test.beforeEach(async ({ page }) => {
    const ctx = loadMusterContext();
    await page.goto(
      `/api/dev/auto-login?email=${encodeURIComponent(ctx.users.sachbearbeiterEmail)}&next=${encodeURIComponent("/portal")}`
    );
    await page.waitForURL(/\/portal/, { timeout: 60_000 });
  });

  test("Buchung Gartenpflege — start_am Folgemonat", async ({ page }) => {
    const ctx = loadMusterContext();
    const slug = ctx.aboSlugs[0];
    const res = await page.request.post("/api/org/katalog/bestellen", {
      data: {
        produktSlug: slug,
        kundeObjektId: ctx.objektGH12.id,
      },
    });
    expect(res.ok()).toBeTruthy();
    const json = (await res.json()) as { modus: string; aboId: string; startAm: string };
    expect(json.modus).toBe("abo");
    expect(json.startAm).toBe(naechsterMonatsanfang());

    const admin = adminClient();
    const { data: abo } = await admin.from("objekt_abos").select("*").eq("id", json.aboId).single();
    expect(abo?.status).toBe("aktiv");
    expect(abo?.start_am).toBe(json.startAm);
  });

  test("Monatslauf Sammelrechnung", async ({ request }) => {
    const secret = process.env.CRON_SECRET?.trim();
    if (!secret) test.skip(true, "CRON_SECRET fehlt");

    const res = await request.post("/api/cron/sammelrechnungen", {
      headers: { Authorization: `Bearer ${secret}` },
    });
    expect(res.ok()).toBeTruthy();
    const json = (await res.json()) as { ok: boolean; rechnungen: number };
    expect(json.ok).toBe(true);
    expect(json.rechnungen).toBeGreaterThanOrEqual(0);
  });

  test("Kündigung mit Frist", async ({ page }) => {
    const ctx = loadMusterContext();
    const book = await page.request.post("/api/org/katalog/bestellen", {
      data: { produktSlug: ctx.aboSlugs[0], kundeObjektId: ctx.objektLS7.id },
    });
    const { aboId } = (await book.json()) as { aboId: string };

    const res = await page.request.post("/api/org/abos/kuendigen", {
      data: { aboId },
    });
    expect(res.ok()).toBeTruthy();
    const json = (await res.json()) as { endAm: string; status: string };
    expect(json.status).toBe("gekuendigt");
    expect(json.endAm).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const events = await auditEventsFor("objekt_abo", aboId, "abo_gekuendigt");
    expect(events.length).toBeGreaterThanOrEqual(1);

    const admin = adminClient();
    const { data: abo } = await admin.from("objekt_abos").select("status, end_am").eq("id", aboId).single();
    expect(abo?.status).toBe("gekuendigt");
    expect(abo?.end_am).toBe(json.endAm);
  });
});
