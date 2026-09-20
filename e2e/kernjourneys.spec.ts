/**
 * P7-7 Kernjourneys — jeder Test legt Daten selbst an, keine test.skip-Ketten.
 * Journeys: Meldung→Eingang, Akut, Hausmeister, Marktplatz/Partner, Storno.
 */
import path from "path";

import { expect, test } from "@playwright/test";

import { loadMusterContext, uniqueMelderEmail } from "./fixtures/muster-context";
import { adminClient, leadById, leadByMelderEmail } from "./helpers/db";
import { dismissCookieBanner } from "./helpers/cookie";
import { submitMeldeForm } from "./helpers/melde-flow";

test.use({
  storageState: path.join(__dirname, ".auth/org-admin.json"),
});

test.describe("Kernjourneys ohne Skip-Ketten", () => {
  test("1 — Meldung landet bei Org (Kernkette Start)", async ({ browser }) => {
    const ctx = loadMusterContext();
    const email = uniqueMelderEmail("kj-melde");
    const page = await browser.newPage();
    await page.goto(`/melden/${ctx.orgKennung}/${ctx.objektGH12.slug}`);
    await dismissCookieBanner(page);
    await submitMeldeForm(page, {
      name: "E2E Kern Meldung",
      email,
      einheit: "1.OG",
      beschreibung: "Kernjourney: Meldung bis Org-Eingang.",
      kategorie: "schaden",
    });
    await page.close();

    const lead = await leadByMelderEmail(email);
    expect(lead?.id).toBeTruthy();
    expect(lead!.auftraggeber_kunde_id).toBe(ctx.orgKundeId);
    expect((lead!.hv_meldung_status ?? "neu").toLowerCase()).toBe("neu");
  });

  test("2 — Akut/Notfall markiert Lead", async ({ browser }) => {
    const ctx = loadMusterContext();
    const email = uniqueMelderEmail("kj-akut");
    const page = await browser.newPage();
    await page.goto(`/melden/${ctx.orgKennung}/${ctx.objektGH12.slug}`);
    await dismissCookieBanner(page);
    await submitMeldeForm(page, {
      name: "E2E Kern Akut",
      email,
      beschreibung: "Kernjourney Akut: Wasseraustritt stark.",
      kategorie: "notfall",
    });
    await page.close();

    const lead = await leadByMelderEmail(email);
    expect(lead?.id).toBeTruthy();
    const situation = String(lead!.situation ?? "").toLowerCase();
    const fd = (lead!.funnel_daten ?? {}) as Record<string, unknown>;
    const akut =
      situation.includes("notfall") ||
      situation.includes("havarie") ||
      String(fd.melde_kategorie ?? "").toLowerCase() === "notfall" ||
      Boolean(fd.havarie) ||
      (lead!.hv_meldung_status ?? "") === "notmassnahme";
    expect(akut, `Akut-Signal fehlt: situation=${situation} status=${lead!.hv_meldung_status}`).toBe(
      true
    );
  });

  test("3 — Hausmeister-Zweig: hm_begutachten antwortet", async ({ page }) => {
    const ctx = loadMusterContext();
    const admin = adminClient();
    const email = uniqueMelderEmail("kj-hm");
    const { data: lead, error } = await admin
      .from("leads")
      .insert({
        anlass: "meldung",
        status: "neu",
        hv_meldung_status: "neu",
        auftraggeber_kunde_id: ctx.orgKundeId,
        kunde_objekt_id: ctx.objektGH12.id,
        melder_name: "E2E HM",
        melder_email: email,
        titel: "Kernjourney HM",
        beschreibung: "HM-Zweig",
      })
      .select("id")
      .single();
    if (error || !lead?.id) throw new Error(error?.message ?? "HM-Lead fehlt");

    try {
      const res = await page.request.post("/api/org/meldung-aktion", {
        data: { leadId: lead.id, aktion: "hm_begutachten" },
      });
      expect(res.status()).not.toBe(404);
      if (res.ok()) {
        const after = await leadById(lead.id);
        expect((after?.hv_meldung_status ?? "").toLowerCase()).toBe("hm_pruefung");
      }
    } finally {
      await admin.from("leads").delete().eq("id", lead.id);
    }
  });

  test("4 — Marktplatz/Partner: Partner-Portal, Org-API gesperrt", async ({ browser }) => {
    const partnerAuth = path.join(__dirname, ".auth/partner.json");
    const ctx = await browser.newContext({ storageState: partnerAuth });
    const page = await ctx.newPage();
    await page.goto("/partner");
    await expect(page.getByText(/Vorgänge|Aufträge|Partner|Anfragen/i).first()).toBeVisible({
      timeout: 30_000,
    });
    const res = await page.request.post("/api/org/meldung-aktion", {
      data: {
        leadId: "00000000-0000-4000-8000-000000000001",
        aktion: "ablehnen",
      },
    });
    expect([401, 403, 404]).toContain(res.status());
    await ctx.close();
  });

  test("5 — Storno: eigene Meldung — API ohne Isolation-404", async ({ page }) => {
    const ctx = loadMusterContext();
    const admin = adminClient();
    const email = uniqueMelderEmail("kj-storno");
    const { data: lead, error } = await admin
      .from("leads")
      .insert({
        anlass: "meldung",
        status: "neu",
        hv_meldung_status: "neu",
        auftraggeber_kunde_id: ctx.orgKundeId,
        kunde_objekt_id: ctx.objektGH12.id,
        melder_name: "E2E Storno",
        melder_email: email,
        titel: "Kernjourney Storno",
        beschreibung: "Storno-Test",
      })
      .select("id")
      .single();
    if (error || !lead?.id) throw new Error(error?.message ?? "Storno-Lead fehlt");

    try {
      const res = await page.request.post("/api/org/vorgang-storno", {
        data: { leadId: lead.id, grund: "E2E Kernjourney Storno" },
      });
      expect(res.status()).not.toBe(404);
      expect([200, 400, 409]).toContain(res.status());
    } finally {
      await admin.from("leads").delete().eq("id", lead.id);
    }
  });
});
