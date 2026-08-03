import { defineConfig, devices } from "@playwright/test";
import { readFileSync, existsSync } from "fs";
import path from "path";

function loadEnvFile(file: string) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim();
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

loadEnvFile(path.join(__dirname, ".env.local"));
loadEnvFile(path.join(__dirname, ".env"));

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 120_000,
  expect: { timeout: 15_000 },
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "public",
      testMatch: /hv-journey\.spec\.ts/,
      grep: /@public/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "org-portal",
      testMatch: /hv-journey\.spec\.ts/,
      grep: /@org-portal/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: path.join(__dirname, "e2e/.auth/org.json"),
      },
    },
    {
      name: "partner-portal",
      testMatch: /portal-journey\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: path.join(__dirname, "e2e/.auth/partner.json"),
      },
    },
    {
      name: "hv-spec",
      testMatch: /tc-\d+.*\.spec\.ts/,
      grepInvert: /@crm/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: path.join(__dirname, "e2e/.auth/org-admin.json"),
      },
    },
    {
      name: "hv-spec-crm",
      testMatch: /tc-(01|09).*\.spec\.ts/,
      grep: /@crm/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: process.env.E2E_CRM_BASE_URL ?? "http://127.0.0.1:3001",
        storageState: path.join(__dirname, "e2e/.auth/crm.json"),
      },
    },
    {
      name: "crm",
      testMatch: /crm-hv\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: process.env.E2E_CRM_BASE_URL ?? "http://127.0.0.1:3001",
        storageState: path.join(__dirname, "e2e/.auth/crm.json"),
      },
    },
  ],
  webServer: process.env.E2E_SKIP_WEBSERVER
    ? undefined
    : [
        {
          command: "npm run dev",
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          env: { ...process.env, TEST_AUTH_BYPASS: "true" },
        },
        ...(process.env.E2E_CRM_BASE_URL?.trim()
          ? [
              {
                command: "npm run dev:skip-auth",
                url: process.env.E2E_CRM_BASE_URL,
                cwd: path.join(__dirname, "../../Bärenwald-Backend/baerenwald-crm-dashboard"),
                reuseExistingServer: !process.env.CI,
                timeout: 120_000,
                env: { ...process.env, CRM_DEV_SKIP_AUTH: "true" },
              },
            ]
          : []),
      ],
});
