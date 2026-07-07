import { mkdirSync, writeFileSync, existsSync, readFileSync } from "fs";
import path from "path";
import { execSync } from "child_process";

import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

import { initUxReport } from "./helpers/ux-report";

export type E2ETestContext = {
  orgKennung: string;
  objektSlug: string;
  objektTitel: string;
  orgKundeId: string;
};

async function ensureOrgKennung(
  admin: ReturnType<typeof createClient>,
  orgId: string,
  current: string | null
): Promise<string> {
  if (current?.trim()) return current.trim();

  const kennung =
    process.env.E2E_ORG_KENNUNG?.trim() ||
    (process.env.E2E_AUTO_SEED === "true" ? "baerenwald-hv" : "");

  if (!kennung) {
    throw new Error(
      "HV ohne org_kennung — bitte E2E_ORG_KENNUNG setzen oder E2E_AUTO_SEED=true."
    );
  }

  if (process.env.E2E_AUTO_SEED === "true") {
    await admin.from("kunden").update({ org_kennung: kennung }).eq("id", orgId);
  }

  return kennung;
}

async function loadTestContext(): Promise<E2ETestContext> {
  const forcedKennung = process.env.E2E_ORG_KENNUNG?.trim();
  const forcedSlug = process.env.E2E_OBJEKT_SLUG?.trim();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY für E2E erforderlich.");
  }

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (forcedKennung && forcedSlug) {
    const { data: org } = await admin
      .from("kunden")
      .select("id, org_kennung")
      .eq("org_kennung", forcedKennung)
      .maybeSingle();
    if (!org?.id) throw new Error(`E2E Org nicht gefunden: ${forcedKennung}`);
    const { data: obj } = await admin
      .from("kunden_objekte")
      .select("titel, melde_slug")
      .eq("kunde_id", org.id)
      .eq("melde_slug", forcedSlug)
      .maybeSingle();
    if (!obj) throw new Error(`E2E Objekt nicht gefunden: ${forcedSlug}`);
    return {
      orgKennung: forcedKennung,
      objektSlug: forcedSlug,
      objektTitel: String(obj.titel),
      orgKundeId: String(org.id),
    };
  }

  const { data: objRow } = await admin
    .from("kunden_objekte")
    .select("titel, melde_slug, kunde_id, kunden!inner(id, org_kennung, portal_modus)")
    .eq("melde_aktiv", true)
    .not("melde_slug", "is", null)
    .eq("kunden.portal_modus", "organisation")
    .limit(1)
    .maybeSingle();

  if (!objRow?.melde_slug || !objRow.kunde_id) {
    throw new Error("Kein aktives Melde-Objekt für eine HV — E2E_OBJEKT_SLUG setzen.");
  }

  const kunden = objRow.kunden as { id?: string; org_kennung?: string | null };
  const orgId = String(kunden.id ?? objRow.kunde_id);
  const orgKennung = await ensureOrgKennung(
    admin,
    orgId,
    kunden.org_kennung ?? forcedKennung ?? null
  );

  return {
    orgKennung,
    objektSlug: String(objRow.melde_slug),
    objektTitel: String(objRow.titel),
    orgKundeId: orgId,
  };
}

async function saveStorageState(
  baseUrl: string,
  role: "org" | "partner" | "crm",
  outPath: string,
  email?: string
) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  if (role === "org") {
    const q = email ? `email=${encodeURIComponent(email)}` : "role=org";
    await page.goto(
      `${baseUrl}/api/dev/auto-login?${q}&next=${encodeURIComponent("/portal")}`
    );
    await page.waitForURL(/\/portal/, { timeout: 60_000 });
  } else if (role === "partner") {
    const q = email ? `email=${encodeURIComponent(email)}` : "role=partner";
    await page.goto(
      `${baseUrl}/api/dev/auto-login?${q}&next=${encodeURIComponent("/partner")}`
    );
    await page.waitForURL(/\/partner/, { timeout: 60_000 });
  } else {
    const crmBase = process.env.E2E_CRM_BASE_URL ?? "http://127.0.0.1:3001";
    await page.goto(
      `${crmBase}/api/dev/auto-login?next=${encodeURIComponent("/anfragen")}`
    );
    await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 60_000 });
  }

  mkdirSync(path.dirname(outPath), { recursive: true });
  await context.storageState({ path: outPath });
  await browser.close();
}

export default async function globalSetup() {
  const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

  if (process.env.E2E_MUSTER === "true") {
    execSync("npx tsx scripts/e2e-seed-musterverwaltung.ts", {
      cwd: path.join(__dirname, ".."),
      stdio: "inherit",
      env: process.env,
    });
  }

  initUxReport();

  let ctx: E2ETestContext;
  const musterPath = path.join(__dirname, ".cache/muster-context.json");
  if (existsSync(musterPath)) {
    const muster = JSON.parse(readFileSync(musterPath, "utf8")) as {
      orgKennung: string;
      orgKundeId: string;
      objektGH12: { slug: string };
    };
    ctx = {
      orgKennung: muster.orgKennung,
      objektSlug: muster.objektGH12.slug,
      objektTitel: "GH12",
      orgKundeId: muster.orgKundeId,
    };
  } else {
    ctx = await loadTestContext();
  }

  const cacheDir = path.join(__dirname, ".cache");
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(path.join(cacheDir, "test-context.json"), JSON.stringify(ctx, null, 2));

  if (process.env.TEST_AUTH_BYPASS === "true") {
    await saveStorageState(baseUrl, "org", path.join(__dirname, ".auth/org.json"));
    await saveStorageState(baseUrl, "partner", path.join(__dirname, ".auth/partner.json"));

    if (existsSync(musterPath)) {
      const muster = JSON.parse(readFileSync(musterPath, "utf8")) as {
        users: { adminEmail: string; sachbearbeiterEmail: string };
        partners: { shkEmail: string; malerEmail: string };
      };
      await saveStorageState(
        baseUrl,
        "org",
        path.join(__dirname, ".auth/org-admin.json"),
        muster.users.adminEmail
      );
      await saveStorageState(
        baseUrl,
        "org",
        path.join(__dirname, ".auth/org-sb.json"),
        muster.users.sachbearbeiterEmail
      );
      await saveStorageState(
        baseUrl,
        "partner",
        path.join(__dirname, ".auth/partner-shk.json"),
        muster.partners.shkEmail
      );
      await saveStorageState(
        baseUrl,
        "partner",
        path.join(__dirname, ".auth/partner-maler.json"),
        muster.partners.malerEmail
      );
    } else {
      const orgAuth = path.join(__dirname, ".auth/org.json");
      const adminAuth = path.join(__dirname, ".auth/org-admin.json");
      if (existsSync(orgAuth) && !existsSync(adminAuth)) {
        writeFileSync(adminAuth, readFileSync(orgAuth, "utf8"));
      }
    }
  }

  if (process.env.E2E_CRM_BASE_URL?.trim()) {
    await saveStorageState(baseUrl, "crm", path.join(__dirname, ".auth/crm.json"));
  }
}
