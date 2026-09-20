/**
 * TC-08 Security — fremde HV sieht/ändert nichts.
 * Jeder Test legt seine Daten selbst an (keine Skip-Ketten).
 */
import { readFileSync } from "fs";
import path from "path";

import { expect, test } from "@playwright/test";

import { loadMusterContext, uniqueMelderEmail } from "./fixtures/muster-context";
import { adminClient, leadByMelderEmail } from "./helpers/db";
import { dismissCookieBanner } from "./helpers/cookie";
import { submitMeldeForm } from "./helpers/melde-flow";

async function insertForeignLead(orgBId: string) {
  const admin = adminClient();
  const email = uniqueMelderEmail("fremd-hv");
  const { data, error } = await admin
    .from("leads")
    .insert({
      anlass: "meldung",
      status: "neu",
      hv_meldung_status: "neu",
      auftraggeber_kunde_id: orgBId,
      melder_name: "E2E Fremd HV",
      melder_email: email,
      titel: "E2E TC-08 Fremdorg-Lead",
      beschreibung: "Darf Org A nicht sehen.",
    })
    .select("id")
    .single();
  if (error || !data?.id) {
    throw new Error(`Fremd-Lead anlegen fehlgeschlagen: ${error?.message ?? "kein id"}`);
  }
  return data as { id: string };
}

test.describe("TC-08 Security — Org-Isolation", () => {
  test.use({
    storageState: path.join(__dirname, ".auth/org-admin.json"),
  });

  test("fremde HV: meldung-aktion auf Fremd-Lead → 404", async ({ page }) => {
    const ctx = loadMusterContext();
    expect(ctx.orgBId, "orgBId aus Muster-Seed").toBeTruthy();
    const foreign = await insertForeignLead(ctx.orgBId);

    try {
      const res = await page.request.post("/api/org/meldung-aktion", {
        data: { leadId: foreign.id, aktion: "ablehnen" },
      });
      expect(res.status()).toBe(404);
      const body = (await res.json()) as { error?: string };
      expect(String(body.error ?? "")).toMatch(/nicht gefunden/i);
    } finally {
      await adminClient().from("leads").delete().eq("id", foreign.id);
    }
  });

  test("fremde HV: Vorgang-Kommentar auf Fremd-Lead → 404/403", async ({ page }) => {
    const ctx = loadMusterContext();
    const foreign = await insertForeignLead(ctx.orgBId);

    try {
      const res = await page.request.post("/api/org/vorgang-kommentare", {
        data: { leadId: foreign.id, text: "E2E darf nicht" },
      });
      expect([403, 404]).toContain(res.status());
    } finally {
      await adminClient().from("leads").delete().eq("id", foreign.id);
    }
  });

  test("eigene Org: meldung-aktion auf eigenen Lead nicht 404", async ({ page }) => {
    const ctx = loadMusterContext();
    const email = uniqueMelderEmail("tc08-own");
    const admin = adminClient();
    const { data: lead, error } = await admin
      .from("leads")
      .insert({
        anlass: "meldung",
        status: "neu",
        hv_meldung_status: "neu",
        auftraggeber_kunde_id: ctx.orgKundeId,
        kunde_objekt_id: ctx.objektGH12.id,
        melder_name: "E2E TC08 Own",
        melder_email: email,
        titel: "E2E TC-08 Eigen-Lead",
        beschreibung: "Eigene Org darf zugreifen.",
      })
      .select("id")
      .single();
    if (error || !lead?.id) {
      throw new Error(`Eigen-Lead: ${error?.message ?? "kein id"}`);
    }

    try {
      const res = await page.request.post("/api/org/meldung-aktion", {
        data: { leadId: lead.id, aktion: "ablehnen" },
      });
      expect(res.status(), await res.text()).not.toBe(404);
    } finally {
      await admin.from("leads").delete().eq("id", lead.id);
    }
  });
});

test.describe("TC-08 Security — unauthentifiziert", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("ohne Session: org meldung-aktion → 401/403", async ({ request }) => {
    const res = await request.post("/api/org/meldung-aktion", {
      data: {
        leadId: "00000000-0000-4000-8000-000000000001",
        aktion: "ablehnen",
      },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("ohne Session: org vorgang-storno → 401/403", async ({ request }) => {
    const res = await request.post("/api/org/vorgang-storno", {
      data: { leadId: "00000000-0000-4000-8000-000000000001", grund: "e2e" },
    });
    expect([401, 403]).toContain(res.status());
  });
});

test.describe("TC-08 Security — Melde → eigene Org", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("Mieter-Meldung landet bei Muster-Org", async ({ page }) => {
    const ctx = loadMusterContext();
    const email = uniqueMelderEmail("tc08-melde");

    await page.goto(`/melden/${ctx.orgKennung}/${ctx.objektGH12.slug}`);
    await dismissCookieBanner(page);
    await submitMeldeForm(page, {
      name: "E2E TC08 Melde",
      email,
      einheit: "EG",
      beschreibung: "TC-08 Melde-Zuordnung zur Org.",
    });

    const lead = await leadByMelderEmail(email);
    expect(lead?.id).toBeTruthy();
    expect(lead!.auftraggeber_kunde_id).toBe(ctx.orgKundeId);
  });
});

// Ensure auth file exists when suite loads (fail loud, no skip)
test.beforeAll(() => {
  const auth = path.join(__dirname, ".auth/org-admin.json");
  readFileSync(auth, "utf8");
});
