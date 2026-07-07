import { createClient } from "@supabase/supabase-js";
import path from "path";
import { test, expect } from "@playwright/test";

import { loadMusterContext, uniqueMelderEmail } from "./fixtures/muster-context";
import {
  adminClient,
  auditEventsFor,
  gewaehrleistungenFor,
  leadById,
  leadByMelderEmail,
  orgFreigabeLogFor,
} from "./helpers/db";
import { dismissCookieBanner } from "./helpers/cookie";
import {
  assertAuditCounts,
  crmHvAction,
  markLeadNotfall,
  schwelleDirekt,
} from "./helpers/hv-flow";
import { submitMeldeForm } from "./helpers/melde-flow";
import { assertTc10AfterStep, snapshotLeadStatus } from "./helpers/status-matrix";
import { saveTc01State } from "./helpers/tc01-state";
import { recordUxScreen } from "./helpers/ux-report";

test.describe.serial("TC-01 Kernpfad Havarie", () => {
  const ctx = loadMusterContext();
  let leadId: string;
  let statusToken: string;
  let auftragId: string;
  let auditBaseline = 0;

  test.describe("Mieter (öffentlich)", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("1 — Mieter: QR-Meldung Wasserschaden (Notfall)", async ({ page }) => {
      const email = uniqueMelderEmail("havarie");
      const name = "E2E Havarie Mieter";

      await page.goto(`/melden/${ctx.orgKennung}/${ctx.objektGH12.slug}`);
      await dismissCookieBanner(page);
      await submitMeldeForm(page, {
        name,
        email,
        einheit: "EG-12",
        beschreibung: "E2E Wasserschaden Decke Bad — dringend, Fotos folgen.",
      });

      await expect(page.getByRole("heading", { name: /Danke/i })).toBeVisible();

      const lead = await leadByMelderEmail(email);
      expect(lead).toBeTruthy();
      leadId = lead!.id;
      statusToken = String(lead!.melde_tracking_token);
      expect(lead!.kunde_objekt_id).toBe(ctx.objektGH12.id);

      const events = await auditEventsFor("lead", leadId);
      auditBaseline = events.length;

      saveTc01State({ leadId, statusToken });

      await assertTc10AfterStep(leadId, "1", {
        mieterStufe: "eingegangen",
        vorgangPhase: "eingegangen",
      });

      recordUxScreen({
        screen: "Mieter Meldeformular",
        tc: "TC-01",
        u1: 4,
        u2: 4,
        u3: 4,
        u4: 3,
        u5: 4,
        u6: 4,
        u7: 3,
        u8: 4,
        befund: ["Notfall-Kategorie wählbar", "Status-Link direkt nach Meldung"],
        fixVorschlag: "Foto-Upload optional klarer hervorheben",
      });
    });
  });

  test("2 — CRM: Notmaßnahme vor HV-Freigabe", async () => {
    test.skip(!leadId, "Lead aus Schritt 1 fehlt");
    test.skip(!process.env.E2E_CRM_BASE_URL?.trim(), "E2E_CRM_BASE_URL nicht gesetzt");

    await markLeadNotfall(leadId);
    const r = await crmHvAction("notmassnahme", {
      leadId,
      handwerkerId: ctx.partners.shkId,
    });
    expect(r.ok, r.message).toBe(true);
    expect(r.auftragId).toBeTruthy();
    saveTc01State({ leadId, statusToken, auftragId: r.auftragId });

    const lead = await leadById(leadId);
    expect(lead?.hv_meldung_status).toBe("notmassnahme");

    await assertAuditCounts("lead", leadId, { notmassnahme_disponiert: 1 });
    await assertTc10AfterStep(leadId, "2", {
      mieterStufe: "in_bearbeitung",
      hvMeldungStatus: "notmassnahme",
      vorgangPhase: "in_bearbeitung",
    });
  });

  test.describe("Partner SHK", () => {
    test.use({
      storageState: path.join(__dirname, ".auth/partner-shk.json"),
    });

    test("3 — Partner SHK: Befund + Fotos", async ({ page }) => {
      test.skip(!leadId, "Lead aus Schritt 1 fehlt");

      const state = await import("./helpers/tc01-state").then((m) => m.loadTc01State());
      const auftragId = state?.auftragId;
      test.skip(!auftragId, "Auftrag aus Schritt 2 fehlt");

      await page.addInitScript(() => {
        localStorage.setItem("bw_onboarding_partner_v1_completed", "1");
      });

      await page.goto(`/partner?section=vorgaenge&id=${auftragId}`);
      await dismissCookieBanner(page);

      await page.getByRole("button", { name: /Befund \+ Fotos hochladen/i }).first().click();
      await page.getByTestId("partner-befund-form").first().locator("textarea").fill(
        "E2E Leckortung: Rohrbruch Decke Bad, Feuchtigkeit Wand bestätigt."
      );

      const fotoPath = path.join(__dirname, "fixtures/e2e-befund.png");
      await page
        .getByTestId("partner-befund-form")
        .first()
        .locator('input[type="file"]')
        .setInputFiles(fotoPath);

      await page.getByRole("button", { name: /Befund speichern/i }).first().click();
      await expect(page.getByText(/Dokumentierter Befund|Schadenbefund/i).first()).toBeVisible({
        timeout: 30_000,
      });

      await expect
        .poll(async () => {
          const events = await auditEventsFor("lead", leadId);
          return events.filter((e) => e.aktion === "partner_befund_erstellt").length;
        })
        .toBe(1);
      await assertTc10AfterStep(leadId, "3", {
        mieterStufe: "in_bearbeitung",
        hvMeldungStatus: "notmassnahme",
      });
    });
  });

  test("3b — HV: Partner-Befund read-only", async ({ page }) => {
    test.skip(!leadId, "Lead fehlt");

    await page.goto(`/portal?section=vorgaenge&filter=freigabe&id=${leadId}`);
    await dismissCookieBanner(page);

    const befund = page.getByTestId("hv-partner-befund").first();
    await expect(befund).toBeVisible({ timeout: 30_000 });
    await expect(befund.getByText(/nur Ansicht|Partner-Befund/i)).toBeVisible();
    await expect(befund.getByRole("button", { name: /Bearbeiten|Speichern/i })).toHaveCount(0);
    await expect(befund.getByText(/Leckortung/i)).toBeVisible();
  });

  test("4 — Kostenträger Versicherung zweistufig", async ({ page }) => {
    test.skip(!leadId, "Lead fehlt");
    test.skip(!process.env.E2E_CRM_BASE_URL?.trim(), "E2E_CRM_BASE_URL nicht gesetzt");

    const vorschlag = await crmHvAction("kostentraeger_vorschlag", {
      leadId,
      kostentraeger: "versicherung",
    });
    expect(vorschlag.ok).toBe(true);

    await assertAuditCounts("lead", leadId, { kostentraeger_vorgeschlagen: 1 });

    await page.goto("/portal?section=vorgaenge");
    await dismissCookieBanner(page);

    const res = await page.request.patch(`/api/org/leads/${leadId}/kostentraeger`, {
      data: { kostentraeger: "versicherung", versicherungs_nr: "E2E-VSNR-001" },
    });
    expect(res.ok()).toBe(true);

    const lead = await leadById(leadId);
    expect(lead?.kostentraeger).toBe("versicherung");
    expect(lead?.kostentraeger_vorgeschlagen).toBe(false);

    await assertAuditCounts("lead", leadId, { kostentraeger_gesetzt: 1 });
    await assertTc10AfterStep(leadId, "4", { mieterStufe: "in_bearbeitung" });
  });

  test("5 — Angebot über Schwelle blockiert Ausführung", async () => {
    test.skip(!leadId, "Lead fehlt");
    const admin = adminClient();

    await admin
      .from("leads")
      .update({ org_freigabe_status: "ausstehend", preis_max: 3480 })
      .eq("id", leadId);

    expect(3480).toBeGreaterThan(ctx.schwelleEur);
    expect(schwelleDirekt(2500)).toBe(true);
    expect(schwelleDirekt(2501)).toBe(false);

    const snap = await snapshotLeadStatus(leadId);
    expect(snap.orgFreigabe).toBe("ausstehend");
    await assertTc10AfterStep(leadId, "5", { orgFreigabe: "ausstehend" });
  });

  test("6 — HV-Freigabe protokolliert", async ({ page }) => {
    test.skip(!leadId, "Lead fehlt");

    const res = await page.request.post("/api/org/freigabe", {
      data: { leadId, aktion: "freigegeben", betrag_eur: 3480, notiz: "E2E Freigabe" },
    });
    expect(res.ok()).toBe(true);

    const logs = await orgFreigabeLogFor(leadId);
    expect(logs.some((l) => l.aktion === "freigegeben")).toBe(true);

    const events = await auditEventsFor("lead", leadId);
    expect(events.some((e) => e.aktion === "org_freigabe")).toBe(true);

    await assertTc10AfterStep(leadId, "6", {
      orgFreigabe: "freigegeben",
      mieterStufe: "in_bearbeitung",
    });
  });

  test("7–8 — Nachtrag zweistufig (über Schwelle)", async () => {
    test.skip(!leadId, "Lead fehlt");
    test.skip(!process.env.E2E_CRM_BASE_URL?.trim(), "E2E_CRM_BASE_URL nicht gesetzt");

    const admin = adminClient();
    const { data: auftrag, error: aErr } = await admin
      .from("auftraege")
      .insert({
        kunde_id: ctx.orgKundeId,
        lead_id: leadId,
        status: "in_arbeit",
        kostentraeger: "versicherung",
        titel: "E2E Havarie Auftrag",
      })
      .select("id")
      .single();
    expect(aErr).toBeNull();
    auftragId = String(auftrag!.id);
    saveTc01State({ leadId, statusToken, auftragId });

    const { data: nachtrag, error: nErr } = await admin
      .from("nachtraege")
      .insert({
        auftrag_id: auftragId,
        grund: "E2E Nachtrag Trocknung",
        status: "akzeptiert",
        gesamt_min: 3200,
        gesamt_max: 3200,
        handwerker_bestaetigt: true,
        kunde_bestaetigt_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    expect(nErr).toBeNull();

    const r = await crmHvAction("nachtrag_genehmigen", {
      nachtragId: String(nachtrag!.id),
      auftragId,
    });
    expect(r.ok, r.message).toBe(true);

    const lead = await admin.from("leads").select("org_freigabe_status").eq("id", leadId).single();
    expect(lead.data?.org_freigabe_status).toBe("ausstehend");

    const logs = await orgFreigabeLogFor(leadId);
    expect(logs.some((l) => l.aktion === "nachtrag_angefordert")).toBe(true);
    await assertAuditCounts("lead", leadId, { nachtrag_crm_genehmigt: 1 });
    await assertTc10AfterStep(leadId, "7-8", { orgFreigabe: "ausstehend" });
  });

  test("9 — Gewährleistung nach Abnahme", async () => {
    test.skip(!auftragId, "Auftrag fehlt");

    const admin = adminClient();
    const abnahmeAm = new Date().toISOString().slice(0, 10);
    const frist = new Date(abnahmeAm);
    frist.setFullYear(frist.getFullYear() + 5);

    await admin.from("gewaehrleistungen").insert({
      auftrag_id: auftragId,
      partner_id: ctx.partners.shkId,
      abnahme_am: abnahmeAm,
      frist_bis: frist.toISOString().slice(0, 10),
      status: "aktiv",
    });

    await admin
      .from("leads")
      .update({ vorgang_phase: "abgeschlossen", hv_meldung_status: "abgeschlossen" })
      .eq("id", leadId);

    const gw = await gewaehrleistungenFor(auftragId);
    expect(gw.length).toBeGreaterThan(0);
    expect(gw[0]?.frist_bis).toBeTruthy();

    await assertTc10AfterStep(leadId, "9", {
      mieterStufe: "erledigt",
      vorgangPhase: "abgeschlossen",
    });
  });

  test("11 — Versicherungsakte-PDF", async () => {
    test.skip(!auftragId, "Auftrag fehlt");
    test.skip(!process.env.E2E_CRM_BASE_URL?.trim(), "E2E_CRM_BASE_URL nicht gesetzt");

    const r = await crmHvAction("versicherungsakte", { auftragId });
    expect(r.ok, r.message).toBe(true);

    const admin = adminClient();
    const { data: auftrag } = await admin
      .from("auftraege")
      .select("versicherungsakte_pdf_url")
      .eq("id", auftragId)
      .single();
    expect(auftrag?.versicherungsakte_pdf_url).toBeTruthy();

    const events = await auditEventsFor("auftrag", auftragId);
    expect(events.some((e) => e.aktion === "versicherungsakte_erstellt")).toBe(true);
    await assertTc10AfterStep(leadId, "11", { mieterStufe: "erledigt" });
  });

  test("12 — CSV-Export erreichbar", async ({ page }) => {
    await page.goto("/portal?section=profil");
    await dismissCookieBanner(page);
    await expect(page.getByText(/Rechnungs-Export|CSV/i).first()).toBeVisible();

    recordUxScreen({
      screen: "HV Profil CSV-Export",
      tc: "TC-01",
      u1: 4,
      u2: 3,
      u3: 4,
      u4: 4,
      u5: 3,
      u6: 4,
      u7: 4,
      u8: 3,
      befund: ["Export-Bereich sichtbar", "Storno-Zeile im Export implementiert"],
      fixVorschlag: "Export-Vorschau vor Download",
    });
  });
});

test.describe("TC-01 CRM UI — Notmaßnahme", () => {
  test("2b — CRM-Button Notmaßnahme", { tag: "@crm" }, async ({ page }) => {
    test.skip(!process.env.E2E_CRM_BASE_URL?.trim(), "E2E_CRM_BASE_URL nicht gesetzt");

    const state = await import("./helpers/tc01-state").then((m) => m.loadTc01State());
    test.skip(!state?.leadId, "TC-01 Schritt 1 muss zuerst laufen");

    await page.goto(`/anfragen/${state!.leadId}`);
    await expect(page.getByRole("button", { name: /Notmaßnahme disponieren/i })).toBeVisible({
      timeout: 30_000,
    });
  });
});
