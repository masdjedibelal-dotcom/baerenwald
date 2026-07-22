/**
 * Design-Audit: Screenshots aller relevanten Seiten (Desktop + Mobile).
 *
 * Voraussetzung: `npm run dev` läuft (Port 3000 oder 3001).
 *
 * Auth (optional, in dieser Reihenfolge):
 *   1. AUDIT_KUNDE_EMAIL / AUDIT_KUNDE_PASSWORD
 *   2. AUDIT_PARTNER_EMAIL / AUDIT_PARTNER_PASSWORD
 *   3. Magic-Link via SUPABASE_SERVICE_ROLE_KEY + INTERN_EMAIL (aus .env.local)
 *
 * Usage: npm run audit:screenshots
 */

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "docs", "design-audit", "screenshots");

const CONSENT = JSON.stringify({
  version: 1,
  necessary: true,
  statistics: false,
  decidedAt: new Date().toISOString(),
});

const VIEWPORTS = {
  desktop: { width: 1440, height: 900, label: "desktop" },
  mobile: { width: 390, height: 844, label: "mobile", isMobile: true },
};

/** @type {Array<{ name: string; path: string; fullPage?: boolean; actions?: (page: import('playwright').Page) => Promise<void> }>} */
const PUBLIC_PAGES = [
  { name: "01-home", path: "/" },
  {
    name: "01-ratgeber-mobile-menu",
    path: "/ratgeber",
    fullPage: false,
    actions: async (page) => {
      await page.getByRole("button", { name: "Menü öffnen" }).click();
      await page.waitForTimeout(500);
    },
  },
  { name: "02-rechner-start", path: "/rechner", fullPage: false },
  { name: "02-rechner-gpt-ki", path: "/rechner?modus=ki", fullPage: false },
  { name: "03-kontakt", path: "/kontakt" },
  { name: "04-ueber-uns", path: "/ueber-uns" },
  { name: "05-ratgeber", path: "/ratgeber" },
  { name: "05-ratgeber-artikel", path: "/ratgeber/bad-sanierung-kosten-muenchen" },
  { name: "06-impressum", path: "/impressum" },
  { name: "07-datenschutz", path: "/datenschutz" },
  { name: "08-agb", path: "/agb" },
  { name: "09-handwerker-muenchen", path: "/handwerker-muenchen" },
  { name: "10-leistung-bad", path: "/leistungen/bad-sanieren" },
  {
    name: "11-cookie-einstellungen",
    path: "/",
    fullPage: false,
    actions: async (page) => {
      await page.getByRole("button", { name: "Cookie-Einstellungen" }).first().click();
      await page.waitForTimeout(400);
    },
  },
];

/** Rechner-Funnel: Trust → Auswahl → erste Funnel-Stufe (Situation). */
const RECHNER_FUNNEL_PAGES = [
  { name: "rechner-funnel-01-trust", path: "/rechner", fullPage: false },
  {
    name: "rechner-funnel-02-wahl",
    path: "/rechner",
    fullPage: false,
    actions: async (page) => {
      const next = page.getByRole("button", { name: /Los geht/i });
      if (await next.isVisible().catch(() => false)) {
        await next.click();
        await page.waitForTimeout(800);
      }
    },
  },
  {
    name: "rechner-funnel-03-situation",
    path: "/rechner",
    fullPage: false,
    actions: async (page) => {
      await page.getByRole("button", { name: /Los geht/i }).click().catch(() => {});
      await page.waitForTimeout(600);
      await page.getByRole("button", { name: "Option für Option" }).click().catch(() => {});
      await page.waitForTimeout(400);
      await page.getByRole("button", { name: /Weiter/i }).click().catch(() => {});
      await page.waitForTimeout(1000);
    },
  },
];

const PORTAL_AUTH_PAGES = [
  { name: "portal-01-login", path: "/portal/login" },
  { name: "portal-02-registrieren", path: "/portal/registrieren" },
  { name: "portal-03-passwort-vergessen", path: "/portal/passwort-vergessen" },
  { name: "portal-04-passwort-neu", path: "/portal/passwort-neu" },
];

const PARTNER_AUTH_PAGES = [
  { name: "partner-01-login", path: "/partner/login" },
  { name: "partner-02-registrieren", path: "/partner/registrieren" },
  {
    name: "partner-02-registrieren-rv",
    path: "/partner/registrieren",
    actions: async (page) => {
      const rv = page.getByText(/Rahmenvertrag/i).first();
      if (await rv.isVisible().catch(() => false)) {
        await rv.scrollIntoViewIfNeeded();
        await page.waitForTimeout(400);
      }
    },
  },
  { name: "partner-03-passwort-vergessen", path: "/partner/passwort-vergessen" },
  { name: "partner-04-passwort-neu", path: "/partner/passwort-neu" },
];

const PORTAL_SECTIONS = ["uebersicht", "anfragen", "angebote", "auftraege", "gpt"];
const PARTNER_SECTIONS = [
  "uebersicht",
  "profil",
  "planer",
  "anfragen",
  "angebote",
  "auftraege",
  "gpt",
];

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  try {
    const raw = readFileSync(envPath, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}

async function resolveBaseUrl() {
  if (process.env.AUDIT_BASE_URL?.trim()) {
    return process.env.AUDIT_BASE_URL.trim();
  }
  const ports = [3000, 3001, 3002];
  const probes = await Promise.allSettled(
    ports.map(async (port) => {
      const res = await fetch(`http://localhost:${port}/`, {
        signal: AbortSignal.timeout(2500),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return `http://localhost:${port}`;
    })
  );
  for (let i = 0; i < ports.length; i++) {
    if (probes[i].status === "fulfilled") {
      const base = probes[i].value;
      console.log(`Server gefunden: ${base}`);
      return base;
    }
  }
  throw new Error(
    "Kein Dev-Server auf Port 3000–3002 — bitte `npm run dev` starten oder AUDIT_BASE_URL setzen."
  );
}

async function ensureDir(p) {
  await mkdir(p, { recursive: true });
}

async function shot(page, filePath, fullPage = true) {
  await page.screenshot({ path: filePath, fullPage, animations: "disabled" });
}

async function prepPage(context) {
  await context.addInitScript((consent) => {
    localStorage.setItem("bw_cookie_consent_v1", consent);
  }, CONSENT);
}

async function gotoReady(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForLoadState("load").catch(() => {});
  await page.waitForTimeout(1200);
}

async function captureList(browser, base, viewportKey, pages, subdir) {
  const vp = VIEWPORTS[viewportKey];
  const dir = path.join(OUT, vp.label, subdir);
  await ensureDir(dir);

  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: Boolean(vp.isMobile),
    hasTouch: Boolean(vp.isMobile),
    deviceScaleFactor: vp.isMobile ? 2 : 1,
    locale: "de-DE",
  });
  await prepPage(context);
  const page = await context.newPage();

  for (const item of pages) {
    const url = `${base}${item.path}`;
    const skipMobileMenu =
      item.name === "01-ratgeber-mobile-menu" && !vp.isMobile;
    if (skipMobileMenu) continue;

    try {
      await gotoReady(page, url);
      if (item.actions) await item.actions(page);
      const fullPage = item.fullPage !== false;
      await shot(page, path.join(dir, `${item.name}.png`), fullPage);
      console.log(`✓ ${vp.label}/${subdir}/${item.name}`);
    } catch (err) {
      console.warn(`✗ ${item.name}: ${err.message}`);
      await shot(page, path.join(dir, `${item.name}-ERROR.png`), false);
    }
  }

  await context.close();
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Temporäres Passwort setzen (lokal testbar, ohne Prod-Redirect des Magic-Links). */
async function ensureAuditPassword(email) {
  const admin = getSupabaseAdmin();
  if (!admin || !email) return null;

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: "http://localhost" },
  });
  if (error || !data?.user?.id) {
    console.warn(`Audit-Login (${email}): ${error?.message ?? "User nicht gefunden"}`);
    return null;
  }

  const tempPassword = `audit-${Date.now().toString(36)}-Bw!`;
  const { error: updateError } = await admin.auth.admin.updateUserById(data.user.id, {
    password: tempPassword,
    email_confirm: true,
  });
  if (updateError) {
    console.warn(`Passwort-Reset (${email}): ${updateError.message}`);
    return null;
  }
  return tempPassword;
}

async function loginWithPassword(page, base, email, password, loginPath) {
  await gotoReady(page, `${base}${loginPath}`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.getByRole("button", { name: /anmelden/i }).click();
  await page.waitForTimeout(3000);
}

async function loginWithAuditPassword(page, base, email, loginPath, dashboardPath) {
  const tempPassword = await ensureAuditPassword(email);
  if (!tempPassword) return false;
  await loginWithPassword(page, base, email, tempPassword, loginPath);
  const onDashboard = page.url().includes(dashboardPath.split("?")[0]);
  if (!onDashboard) {
    await gotoReady(page, `${base}${dashboardPath}`);
  }
  return page.url().includes(dashboardPath.split("?")[0]);
}

async function discoverKundeDetailPages(email) {
  const admin = getSupabaseAdmin();
  if (!admin || !email) return [];

  const norm = email.trim().toLowerCase();
  const { data: kunde } = await admin
    .from("kunden")
    .select("id")
    .ilike("email", norm)
    .limit(1)
    .maybeSingle();
  if (!kunde?.id) return [];

  const [{ data: leads }, { data: angebote }, { data: auftraege }] = await Promise.all([
    admin
      .from("leads")
      .select("id")
      .eq("kunde_id", kunde.id)
      .order("created_at", { ascending: false })
      .limit(1),
    admin
      .from("angebote")
      .select("id")
      .eq("kunde_id", kunde.id)
      .order("created_at", { ascending: false })
      .limit(1),
    admin
      .from("auftraege")
      .select("id")
      .eq("kunde_id", kunde.id)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const pages = [];
  if (leads?.[0]?.id) {
    pages.push({
      name: "detail-anfragen",
      path: `/portal?section=anfragen&id=${leads[0].id}`,
      fullPage: false,
    });
  }
  if (angebote?.[0]?.id) {
    pages.push({
      name: "detail-angebote",
      path: `/portal?section=angebote&id=${angebote[0].id}`,
      fullPage: false,
    });
  }
  if (auftraege?.[0]?.id) {
    pages.push({
      name: "detail-auftraege",
      path: `/portal?section=auftraege&id=${auftraege[0].id}`,
      fullPage: false,
    });
  }
  return pages;
}

async function discoverPartnerDetailPages(email) {
  const admin = getSupabaseAdmin();
  if (!admin || !email) return [];

  const norm = email.trim().toLowerCase();
  const { data: hw } = await admin
    .from("handwerker")
    .select("id")
    .ilike("email", norm)
    .maybeSingle();
  if (!hw?.id) return [];

  const pages = [];

  const { data: anfragen } = await admin
    .from("angebot_handwerker")
    .select("id, status")
    .eq("handwerker_id", hw.id)
    .order("gesendet_at", { ascending: false })
    .limit(8);

  if (anfragen?.[0]?.id) {
    pages.push({
      name: "detail-anfragen",
      path: `/partner?section=anfragen&id=${anfragen[0].id}`,
      fullPage: false,
    });
  }

  const akzeptiert = (anfragen ?? []).find(
    (a) => String(a.status ?? "").toLowerCase() === "akzeptiert"
  );
  if (akzeptiert?.id) {
    pages.push({
      name: "detail-angebote",
      path: `/partner?section=angebote&id=${akzeptiert.id}`,
      fullPage: false,
    });
  }

  const { data: hwAuf } = await admin
    .from("auftrag_handwerker")
    .select("auftrag_id, status")
    .eq("handwerker_id", hw.id)
    .limit(10);

  const pending = (hwAuf ?? []).find((r) => {
    const st = String(r.status ?? "").toLowerCase();
    return ["angefragt", "ausstehend", "warten", "offen", "zugewiesen"].includes(st);
  });
  if (pending?.auftrag_id) {
    pages.push({
      name: "detail-anfragen-auftrag",
      path: `/partner?section=anfragen&id=auftrag:${pending.auftrag_id}`,
      fullPage: false,
    });
  }

  let auftragId = (hwAuf ?? []).find(
    (r) => String(r.status ?? "").toLowerCase() === "akzeptiert"
  )?.auftrag_id;
  if (!auftragId) {
    const { data: pos } = await admin
      .from("auftrag_positionen")
      .select("auftrag_id")
      .eq("handwerker_id", hw.id)
      .limit(1);
    auftragId = pos?.[0]?.auftrag_id;
  }
  if (auftragId) {
    pages.push({
      name: "detail-auftraege",
      path: `/partner?section=auftraege&id=${auftragId}`,
      fullPage: false,
    });
  }

  return pages;
}

async function captureAuthenticated(
  browser,
  base,
  viewportKey,
  { email, password, loginPath, sections, prefix, dashboardPath, detailPages = [] }
) {
  if (!email) {
    console.log(`— ${prefix}: keine E-Mail, übersprungen`);
    return { ok: false, reason: "no-email" };
  }

  const vp = VIEWPORTS[viewportKey];
  const dir = path.join(OUT, vp.label, prefix);
  await ensureDir(dir);

  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: Boolean(vp.isMobile),
    hasTouch: Boolean(vp.isMobile),
    deviceScaleFactor: vp.isMobile ? 2 : 1,
    locale: "de-DE",
  });
  await prepPage(context);
  const page = await context.newPage();

  let loggedIn = false;
  try {
    if (password) {
      await loginWithPassword(page, base, email, password, loginPath);
      loggedIn = page.url().includes(dashboardPath.split("?")[0]);
    }
    if (!loggedIn) {
      loggedIn = await loginWithAuditPassword(
        page,
        base,
        email,
        loginPath,
        dashboardPath
      );
    }
    if (!loggedIn) {
      throw new Error("Login fehlgeschlagen (Passwort + Magic-Link)");
    }

    await shot(page, path.join(dir, `${prefix}-00-nach-login.png`));

    for (const section of sections) {
      const url = `${base}${dashboardPath}?section=${section}`;
      await gotoReady(page, url);
      await shot(page, path.join(dir, `${prefix}-${section}.png`));

      if (section === "gpt") {
        if (vp.isMobile) {
          const gptBtn = page.getByRole("button", { name: "GPT öffnen" });
          if (await gptBtn.isVisible().catch(() => false)) {
            await gptBtn.click();
            await page.waitForTimeout(800);
            await shot(page, path.join(dir, `${prefix}-gpt-overlay-mobile.png`), false);
          }
        } else {
          await shot(page, path.join(dir, `${prefix}-gpt-desktop.png`), false);
        }
      }
      console.log(`✓ ${vp.label}/${prefix}/${section}`);
    }

    for (const dp of detailPages) {
      const url = `${base}${dp.path}`;
      await gotoReady(page, url);
      if (dp.actions) await dp.actions(page);
      const fullPage = dp.fullPage !== false;
      await shot(page, path.join(dir, `${prefix}-${dp.name}.png`), fullPage);
      console.log(`✓ ${vp.label}/${prefix}/${dp.name}`);
    }

    await context.close();
    return { ok: true };
  } catch (err) {
    console.warn(`✗ ${prefix} auth: ${err.message}`);
    await shot(page, path.join(dir, `${prefix}-ERROR.png`), false);
    await context.close();
    return { ok: false, reason: err.message };
  }
}

async function walkPngFiles(dir, rel = "") {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const relPath = rel ? `${rel}/${e.name}` : e.name;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      files.push(...(await walkPngFiles(full, relPath)));
    } else if (e.name.endsWith(".png")) {
      files.push(relPath);
    }
  }
  return files.sort();
}

async function writeIndex(base, authResults) {
  const lines = [
    "# Design-Audit Index",
    "",
    `Generiert: ${new Date().toISOString()}`,
    "",
    `Basis-URL: \`${base}\``,
    "",
    "## Viewports",
    "",
    "| Gerät | Auflösung |",
    "|-------|-----------|",
    "| Desktop | 1440 × 900 |",
    "| Mobile | 390 × 844 (@2x) |",
    "",
    "## Auth-Status",
    "",
    `- Kundenportal: ${authResults.kunde.ok ? "✓ eingeloggt" : `✗ ${authResults.kunde.reason ?? "fehlgeschlagen"}`}`,
    `- Partnerportal: ${authResults.partner.ok ? "✓ eingeloggt" : `✗ ${authResults.partner.reason ?? "fehlgeschlagen"}`}`,
    "",
    "Cookie-Banner wurde per `localStorage` (`bw_cookie_consent_v1`) umgangen.",
    "",
    "## Screenshots",
    "",
  ];

  for (const vp of ["desktop", "mobile"]) {
    const vpDir = path.join(OUT, vp);
    let files = [];
    try {
      files = await walkPngFiles(vpDir);
    } catch {
      continue;
    }
    lines.push(`### ${vp === "desktop" ? "Desktop" : "Mobile"}`, "");
    let currentGroup = "";
    for (const f of files) {
      const group = f.includes("/") ? f.split("/")[0] : "root";
      if (group !== currentGroup) {
        currentGroup = group;
        lines.push(`#### ${group}`, "");
      }
      const title = path.basename(f, ".png");
      lines.push(`- [${title}](screenshots/${vp}/${f})`);
    }
    lines.push("");
  }

  await writeFile(path.join(ROOT, "docs", "design-audit", "INDEX.md"), lines.join("\n"));
}

async function main() {
  loadEnvLocal();
  const base = await resolveBaseUrl();

  await ensureDir(OUT);
  console.log(`Audit → ${OUT}`);
  console.log(`Base: ${base}`);

  const browser = await chromium.launch({ headless: true });

  const kundeEmail = process.env.AUDIT_KUNDE_EMAIL || process.env.INTERN_EMAIL;
  const kundePassword = process.env.AUDIT_KUNDE_PASSWORD;
  const partnerEmail = process.env.AUDIT_PARTNER_EMAIL || process.env.INTERN_EMAIL;
  const partnerPassword = process.env.AUDIT_PARTNER_PASSWORD;

  const authResults = { kunde: { ok: false }, partner: { ok: false } };
  const kundeDetails = await discoverKundeDetailPages(kundeEmail);
  const partnerDetails = await discoverPartnerDetailPages(partnerEmail);
  if (kundeDetails.length) {
    console.log(`Kunde Detail-URLs: ${kundeDetails.map((p) => p.name).join(", ")}`);
  }
  if (partnerDetails.length) {
    console.log(`Partner Detail-URLs: ${partnerDetails.map((p) => p.name).join(", ")}`);
  }

  for (const vp of Object.keys(VIEWPORTS)) {
    await captureList(browser, base, vp, PUBLIC_PAGES, "marketing");
    await captureList(browser, base, vp, RECHNER_FUNNEL_PAGES, "marketing");
    await captureList(browser, base, vp, PORTAL_AUTH_PAGES, "portal-auth");
    await captureList(browser, base, vp, PARTNER_AUTH_PAGES, "partner-auth");

    const kunde = await captureAuthenticated(browser, base, vp, {
      email: kundeEmail,
      password: kundePassword,
      loginPath: "/portal/login",
      sections: PORTAL_SECTIONS,
      prefix: "portal",
      dashboardPath: "/portal",
      detailPages: kundeDetails,
    });
    if (kunde.ok) authResults.kunde = kunde;

    const partner = await captureAuthenticated(browser, base, vp, {
      email: partnerEmail,
      password: partnerPassword,
      loginPath: "/partner/login",
      sections: PARTNER_SECTIONS,
      prefix: "partner",
      dashboardPath: "/partner",
      detailPages: partnerDetails,
    });
    if (partner.ok) authResults.partner = partner;
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    baseUrl: base,
    viewports: VIEWPORTS,
    auth: {
      kundeEmail: kundeEmail ? `${kundeEmail.slice(0, 3)}…` : null,
      partnerEmail: partnerEmail ? `${partnerEmail.slice(0, 3)}…` : null,
      kundeOk: authResults.kunde.ok,
      partnerOk: authResults.partner.ok,
    },
    output: OUT,
  };
  await writeFile(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
  await writeIndex(base, authResults);

  await browser.close();
  console.log("\nFertig. manifest.json + INDEX.md geschrieben.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
