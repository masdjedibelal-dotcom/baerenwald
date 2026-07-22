import path from "path";

import { test, expect } from "@playwright/test";

import { dismissCookieBanner } from "./helpers/cookie";
import { recordUxScreen } from "./helpers/ux-report";

test.describe("TC-07 Multi-User & Rollen (entfernt)", () => {
  test.use({
    storageState: path.join(__dirname, ".auth/org-sb.json"),
  });

  test("Sachbearbeiter: Schwelle gesperrt (UI), kein Team", async ({ page }) => {
    await page.goto("/portal?section=profil");
    await dismissCookieBanner(page);

    await expect(
      page.getByText(/Nur Administratoren können Freigabe-Regeln/i)
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Speichern" })).toHaveCount(0);
    await expect(page.getByPlaceholder("kollege@hausverwaltung.de")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Team" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Team" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Team" })).toHaveCount(0);

    recordUxScreen({
      screen: "HV Profil Sachbearbeiter",
      tc: "TC-07",
      u1: 4,
      u2: 4,
      u3: 4,
      u4: 4,
      u5: 3,
      u6: 4,
      u7: 4,
      u8: 3,
      befund: ["RBAC-Hinweis sichtbar", "Kein Speichern; Team-UI entfernt"],
      fixVorschlag: "Gesperrte Felder visuell stärker absetzen",
    });
  });

  test("Sachbearbeiter: PATCH Einstellungen → 403", async ({ page }) => {
    const res = await page.request.patch("/api/org/einstellungen", {
      data: { freigabe_schwelle_eur: 9999 },
    });
    expect(res.status()).toBe(403);
  });

  test("Team-API existiert nicht mehr", async ({ page }) => {
    const res = await page.request.post("/api/org/team", {
      data: { email: "blocked@example.com", rolle: "lesen" },
    });
    expect([404, 405]).toContain(res.status());
  });
});

test.describe("TC-07 Admin", () => {
  test.use({
    storageState: path.join(__dirname, ".auth/org-admin.json"),
  });

  test("Admin: Team-API entfernt", async ({ page }) => {
    const email = `e2e-lesen+${Date.now()}@baerenwald-test.local`;
    const res = await page.request.post("/api/org/team", {
      data: { email, rolle: "lesen" },
    });
    expect([404, 405]).toContain(res.status());
  });

  test("Admin: kein Team in Navigation", async ({ page }) => {
    await page.goto("/portal?section=uebersicht");
    await dismissCookieBanner(page);
    await expect(page.getByRole("link", { name: "Team" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Team" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Team" })).toHaveCount(0);
  });
});
