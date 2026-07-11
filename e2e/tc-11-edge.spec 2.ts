import { test, expect } from "@playwright/test";

import { loadMusterContext, uniqueMelderEmail } from "./fixtures/muster-context";
import { adminClient, leadByMelderEmail } from "./helpers/db";
import { dismissCookieBanner } from "./helpers/cookie";
import { schwelleDirekt } from "./helpers/hv-flow";
import { submitMeldeForm } from "./helpers/melde-flow";

test.describe("TC-11 Edge Cases — lauffähig", () => {
  test.describe("Mieter (öffentlich)", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("a) Meldung ohne Foto zulässig", async ({ page }) => {
      const ctx = loadMusterContext();
      const email = uniqueMelderEmail("ohne-foto");

      await page.goto(`/melden/${ctx.orgKennung}/${ctx.objektGH12.slug}`);
      await dismissCookieBanner(page);
      await submitMeldeForm(page, {
        name: "Ohne Foto",
        email,
        beschreibung: "Meldung ohne Foto — E2E",
      });

      const lead = await leadByMelderEmail(email);
      expect(lead?.id).toBeTruthy();
    });

    test("b) Duplikat-Hinweis 24h", async ({ page }) => {
      const ctx = loadMusterContext();
      const einheit = `E2E-DUP-${Date.now()}`;
      const email1 = uniqueMelderEmail("dup-a");
      const email2 = uniqueMelderEmail("dup-b");

      await page.goto(`/melden/${ctx.orgKennung}/${ctx.objektGH12.slug}`);
      await dismissCookieBanner(page);
      await submitMeldeForm(page, {
        name: "Dup A",
        email: email1,
        einheit,
        beschreibung: "Erste Meldung",
      });

      await page.goto(`/melden/${ctx.orgKennung}/${ctx.objektGH12.slug}`);
      await submitMeldeForm(page, {
        name: "Dup B",
        email: email2,
        einheit,
        beschreibung: "Zweite Meldung gleiche Einheit",
      });

      const lead2 = await leadByMelderEmail(email2);
      expect(lead2?.duplikat_hinweis).toBe(true);
    });

    test("c) Schwelle exakt 2.500 € — direkt vs. Angebot", async () => {
      const ctx = loadMusterContext();
      expect(ctx.schwelleEur).toBe(2500);
      expect(schwelleDirekt(2500)).toBe(true);
      expect(schwelleDirekt(2501)).toBe(false);
    });
  });

  test("e) Storno-Zeile Export", async ({ page }) => {
    const ctx = loadMusterContext();
    const admin = adminClient();

    const { data: auftrag } = await admin
      .from("auftraege")
      .insert({
        kunde_id: ctx.orgKundeId,
        status: "abgeschlossen",
        titel: "E2E Storno Export",
      })
      .select("id")
      .single();

    await admin.from("rechnungen").insert({
      auftrag_id: auftrag!.id,
      kunde_id: ctx.orgKundeId,
      rechnungsnummer: `E2E-ST-${Date.now()}`,
      rechnungsdatum: new Date().toISOString().slice(0, 10),
      netto: 100,
      mwst_betrag: 19,
      brutto: 119,
      lohnanteil_eur: 40,
      lohnanteil_prozent: 40,
      status: "storniert",
      kostentraeger: "gemeinschaft",
    });

    const res = await page.request.get("/api/org/export/rechnungen");
    expect(res.ok()).toBe(true);
    const csv = await res.text();
    expect(csv).toContain("STORNO");
    expect(csv).toMatch(/-100|100,00;-19|storno/i);
  });
});

test.describe("TC-11 Edge Cases — ausstehend", () => {
  test.fixme("d) Partner lehnt ab — Re-Disposition", "CRM-Flow E2E ausstehend");
  test.fixme("f) Export ohne Kostenstelle — Objekt-ID Fallback", "Manueller Export-Test");
});
