/**
 * Marketing & Onboarding Screenshots aus dem echten Portal/Partner-System.
 * Ausgabe: public/images/landing/ + public/images/onboarding/
 *
 * Voraussetzung: npm run dev + .env.local (SUPABASE_SERVICE_ROLE_KEY, INTERN_EMAIL)
 * Usage: node scripts/capture-marketing-portal-screenshots.mjs
 */

import { mkdir, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const LANDING_OUT = path.join(ROOT, "public", "images", "landing");
const ONBOARDING_OUT = path.join(ROOT, "public", "images", "onboarding");

const CONSENT = JSON.stringify({
  version: 1,
  necessary: true,
  statistics: false,
  decidedAt: new Date().toISOString(),
});

const VIEWPORTS = {
  desktop: { width: 1440, height: 900, label: "desktop", isMobile: false },
  mobile: { width: 390, height: 844, label: "mobile", isMobile: true },
};

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

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function resolveBaseUrl() {
  if (process.env.AUDIT_BASE_URL?.trim()) return process.env.AUDIT_BASE_URL.trim();
  for (const port of [3000, 3001, 3002]) {
    try {
      const res = await fetch(`http://localhost:${port}/`, {
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) return `http://localhost:${port}`;
    } catch {
      /* next */
    }
  }
  throw new Error("Dev-Server nicht erreichbar — bitte npm run dev starten.");
}

/**
 * Service-Role-Passwort-Reset nur gegen lokale Supabase oder mit explizitem Allow.
 * Verhindert versehentliche Prod-Account-Resets via INTERN_EMAIL.
 */
function assertServiceRolePasswordResetAllowed() {
  if (process.env.AUDIT_ALLOW_SERVICE_ROLE_PASSWORD_RESET === "true") {
    return;
  }
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  let host = "";
  try {
    host = new URL(raw).hostname;
  } catch {
    host = raw;
  }
  if (/localhost|127\.0\.0\.1|\[::1\]/i.test(host)) {
    return;
  }
  throw new Error(
    `Service-Role-Passwort-Reset verweigert für „${host || "(keine URL)"}“. ` +
      `Setze AUDIT_*_PASSWORD oder (nur Staging) AUDIT_ALLOW_SERVICE_ROLE_PASSWORD_RESET=true.`
  );
}

async function ensureAuditPassword(email) {
  assertServiceRolePasswordResetAllowed();
  const admin = getSupabaseAdmin();
  if (!admin || !email) return null;
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: "http://localhost" },
  });
  if (error || !data?.user?.id) return null;
  const tempPassword = `audit-${Date.now().toString(36)}-Bw!`;
  const { error: updateError } = await admin.auth.admin.updateUserById(data.user.id, {
    password: tempPassword,
    email_confirm: true,
  });
  if (updateError) return null;
  return tempPassword;
}

const GOTO_OPTS = { waitUntil: "domcontentloaded", timeout: 90000 };

async function gotoReady(page, url) {
  await page.goto(url, GOTO_OPTS);
  await page.waitForLoadState("load").catch(() => {});
  await page.waitForTimeout(2000);
}

async function login(page, base, email, password, loginPath, dashboardPath) {
  const dashPath = dashboardPath.split("?")[0];
  await gotoReady(page, `${base}${loginPath}`);

  const emailInput = page.locator('input[type="email"], input[autocomplete="email"]').first();
  const visible = await emailInput.isVisible({ timeout: 8000 }).catch(() => false);
  if (!visible) {
    if (page.url().includes(dashPath)) return;
    await gotoReady(page, `${base}${dashboardPath}`);
    if (page.url().includes(dashPath)) return;
    throw new Error(`Login-Formular nicht gefunden: ${page.url()}`);
  }

  await emailInput.fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole("button", { name: /^anmelden$/i }).click();
  await page.waitForTimeout(3500);

  if (!page.url().includes(dashPath)) {
    await gotoReady(page, `${base}${dashboardPath}`);
  }
}

async function scrollToText(page, text) {
  const el = page.getByText(text, { exact: false }).first();
  if (await el.isVisible().catch(() => false)) {
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  }
}

async function discoverKundeWithOpenAnfrage() {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data: leads } = await admin
    .from("leads")
    .select("id, kunde_id, kunden(email)")
    .order("created_at", { ascending: false })
    .limit(40);
  for (const lead of leads ?? []) {
    const email = lead.kunden?.email?.trim();
    if (!email) continue;
    const [{ count: angebotCount }, { count: auftragCount }] = await Promise.all([
      admin.from("angebote").select("id", { count: "exact", head: true }).eq("lead_id", lead.id),
      admin.from("auftraege").select("id", { count: "exact", head: true }).eq("lead_id", lead.id),
    ]);
    if ((angebotCount ?? 0) === 0 && (auftragCount ?? 0) === 0) {
      return email;
    }
  }
  return null;
}

async function discoverBestKundeEmail() {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const withAnfrage = await discoverKundeWithOpenAnfrage();
  if (withAnfrage) return withAnfrage;
  const { data } = await admin
    .from("leads")
    .select("kunde_id, kunden(email)")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.kunden?.email?.trim() || null;
}

async function discoverKundeWithVisibleAngebot() {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data: angebote } = await admin
    .from("angebote")
    .select("id, kunde_id, kunden(email)")
    .order("created_at", { ascending: false })
    .limit(30);
  for (const angebot of angebote ?? []) {
    const email = angebot.kunden?.email?.trim();
    if (!email) continue;
    const { count } = await admin
      .from("auftraege")
      .select("id", { count: "exact", head: true })
      .eq("angebot_id", angebot.id);
    if ((count ?? 0) === 0) return email;
  }
  return null;
}

async function discoverBestKundeForRichData() {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data: auf } = await admin
    .from("auftraege")
    .select("kunde_id, kunden(email)")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return auf?.kunden?.email?.trim() || null;
}

async function discoverBestPartnerEmail() {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data } = await admin
    .from("angebot_handwerker")
    .select("handwerker_id, handwerker(email)")
    .order("gesendet_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.handwerker?.email?.trim() || null;
}

async function switchSectionViaUi(page, sectionId, audience, vp) {
  const labels = {
    uebersicht: "Übersicht",
    anfragen: "Anfragen",
    angebote: "Angebote",
    auftraege: "Aufträge",
    gpt: audience === "portal" ? "GPT" : "GPT",
  };
  const label = labels[sectionId];
  if (!label) return;

  if (vp.isMobile) {
    const nav = page.getByRole("navigation", {
      name: audience === "portal" ? "Portal Navigation" : "Partner Navigation",
    });
    await nav.getByRole("button", { name: label, exact: true }).click();
  } else {
    await page
      .getByRole("navigation")
      .filter({ has: page.getByText(label, { exact: true }) })
      .getByRole("button", { name: new RegExp(`^${label}`) })
      .first()
      .click();
  }
  await page.waitForTimeout(1000);
}

async function openFirstDetailCard(page, vp) {
  const card = page.locator("article").first();
  if (await card.isVisible({ timeout: 4000 }).catch(() => false)) {
    await card.click();
    await page.waitForTimeout(vp.isMobile ? 1200 : 800);
  }
}

async function openPortalSection(page, base, sectionId, urls, vp) {
  const detailBySection = {
    anfragen: urls.anfrage,
    angebote: urls.angebot,
    auftraege: urls.auftrag,
  };
  const detailUrl = detailBySection[sectionId];
  if (detailUrl) {
    await gotoReady(page, `${base}${detailUrl}`);
    return;
  }
  await gotoReady(page, `${base}/portal`);
  await switchSectionViaUi(page, sectionId, "portal", vp);
  await openFirstDetailCard(page, vp);
}

async function openPartnerSection(page, base, sectionId, urls, vp) {
  const detailBySection = {
    anfragen: urls.anfrage,
    angebote: urls.angebot,
    auftraege: urls.auftrag,
  };
  const detailUrl = detailBySection[sectionId];
  if (detailUrl) {
    await gotoReady(page, `${base}${detailUrl}`);
    return;
  }
  await gotoReady(page, `${base}/partner`);
  await switchSectionViaUi(page, sectionId, "partner", vp);
  await openFirstDetailCard(page, vp);
}

async function discoverKundeUrls(email) {
  const admin = getSupabaseAdmin();
  if (!admin || !email) return {};
  const { data: kunde } = await admin
    .from("kunden")
    .select("id")
    .ilike("email", email.trim().toLowerCase())
    .limit(1)
    .maybeSingle();
  if (!kunde?.id) return {};

  const [{ data: leads }, { data: angebote }, { data: auftraege }] = await Promise.all([
    admin
      .from("leads")
      .select("id")
      .eq("kunde_id", kunde.id)
      .order("created_at", { ascending: false })
      .limit(12),
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

  let angebotId = null;
  for (const angebot of angebote ?? []) {
    const { count } = await admin
      .from("auftraege")
      .select("id", { count: "exact", head: true })
      .eq("angebot_id", angebot.id);
    if ((count ?? 0) === 0) {
      angebotId = angebot.id;
      break;
    }
  }

  let anfrageLeadId = null;
  for (const lead of leads ?? []) {
    const [{ count: angebotCount }, { count: auftragCount }] = await Promise.all([
      admin.from("angebote").select("id", { count: "exact", head: true }).eq("lead_id", lead.id),
      admin.from("auftraege").select("id", { count: "exact", head: true }).eq("lead_id", lead.id),
    ]);
    if ((angebotCount ?? 0) === 0 && (auftragCount ?? 0) === 0) {
      anfrageLeadId = lead.id;
      break;
    }
  }

  return {
    anfrage: anfrageLeadId ? `/portal?section=anfragen&id=${anfrageLeadId}` : null,
    angebot: angebotId ? `/portal?section=angebote&id=${angebotId}` : null,
    auftrag: auftraege?.[0]?.id ? `/portal?section=auftraege&id=${auftraege[0].id}` : null,
  };
}

async function discoverPartnerUrls(email) {
  const admin = getSupabaseAdmin();
  if (!admin || !email) return {};
  const { data: hw } = await admin
    .from("handwerker")
    .select("id")
    .ilike("email", email.trim().toLowerCase())
    .maybeSingle();
  if (!hw?.id) return {};

  const { data: anfragen } = await admin
    .from("angebot_handwerker")
    .select("id, status")
    .eq("handwerker_id", hw.id)
    .order("gesendet_at", { ascending: false })
    .limit(8);

  const offen = (anfragen ?? []).find((a) => {
    const st = String(a.status ?? "").toLowerCase();
    return !["akzeptiert", "abgelehnt", "abgeschlossen"].includes(st);
  });
  const akzeptiert = (anfragen ?? []).find(
    (a) => String(a.status ?? "").toLowerCase() === "akzeptiert"
  );

  const { data: hwAuf } = await admin
    .from("auftrag_handwerker")
    .select("auftrag_id, status")
    .eq("handwerker_id", hw.id)
    .limit(10);

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

  const firstAnfrageId = anfragen?.[0]?.id ?? null;

  return {
    anfrage: offen?.id
      ? `/partner?section=anfragen&id=${offen.id}`
      : akzeptiert?.id
        ? `/partner?section=angebote&id=${akzeptiert.id}`
        : firstAnfrageId
          ? `/partner?section=angebote&id=${firstAnfrageId}`
          : null,
    angebot: akzeptiert?.id
      ? `/partner?section=angebote&id=${akzeptiert.id}`
      : firstAnfrageId
        ? `/partner?section=angebote&id=${firstAnfrageId}`
        : null,
    auftrag: auftragId ? `/partner?section=auftraege&id=${auftragId}` : null,
  };
}

async function anonymizePageForScreenshot(page) {
  await page.evaluate(() => {
    const demo = {
      greeting: "Hallo Max",
      vorname: "Max",
      nachname: "Mustermann",
      name: "Max Mustermann",
      plz: "80331",
      ort: "München",
      strasse: "Musterstraße 1",
      email: "max.mustermann@example.com",
      cardTitles: [
        "Bad Komplett — Max Mustermann",
        "Hausservice Komfort — Max Mustermann",
        "Fliesen & Reparatur — Max Mustermann",
      ],
    };

    const replaceLeafText = (el, transform) => {
      if (el.children.length > 0) return;
      const text = el.textContent ?? "";
      const next = transform(text);
      if (next !== text) el.textContent = next;
    };

    document.querySelectorAll(".portal-text-section").forEach((el) => {
      replaceLeafText(el, (text) =>
        /^Hallo\s/i.test(text.trim()) ? demo.greeting : text
      );
    });

    document.querySelectorAll(".portal-text-card-title").forEach((el, i) => {
      el.textContent = demo.cardTitles[i % demo.cardTitles.length];
    });

    document.querySelectorAll(
      "h1, h2, h3, h4, p, span, div, td, li, label, dd, button"
    ).forEach((el) => {
      replaceLeafText(el, (text) => {
        let next = text;
        if (/^Hallo\s+\S+/i.test(next.trim())) {
          next = next.replace(/^Hallo\s+\S+/i, demo.greeting);
        }
        next = next.replace(/\b\d{5}\s+[A-ZÄÖÜ][\wäöüß-]+(\s+[A-ZÄÖÜ][\wäöüß-]+)?\b/g, `${demo.plz} ${demo.ort}`);
        next = next.replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, demo.email);
        next = next.replace(/\b(Belal|Vera|Ralf|Mörth|Schmölz)\b[\wäöüß-]*/gi, demo.vorname);
        if (/—/.test(next) && next.length < 120) {
          next = next.replace(/—\s*.+?(?=\s*\(|$)/, `— ${demo.name}`);
        }
        return next;
      });
    });

    document.querySelectorAll("input, textarea").forEach((el) => {
      const val = el.value?.trim() ?? "";
      if (!val || val.length < 2) return;
      const key = el.name?.toLowerCase() ?? el.id?.toLowerCase() ?? "";
      if (key.includes("vorname") || key.includes("first")) el.value = demo.vorname;
      else if (key.includes("nachname") || key.includes("last")) el.value = demo.nachname;
      else if (key.includes("plz") || key.includes("postal")) el.value = demo.plz;
      else if (key.includes("ort") || key.includes("city")) el.value = demo.ort;
      else if (key.includes("strasse") || key.includes("street")) el.value = demo.strasse;
      else if (key.includes("email")) el.value = demo.email;
      else if (key.includes("name")) el.value = demo.name;
    });

    document.querySelectorAll("dl dt").forEach((dt) => {
      const dd = dt.nextElementSibling;
      if (!dd || dd.tagName !== "DD") return;
      const l = dt.textContent?.toLowerCase().trim() ?? "";
      if (l.includes("vorname")) dd.textContent = demo.vorname;
      else if (l.includes("nachname")) dd.textContent = demo.nachname;
      else if (l.includes("plz")) dd.textContent = demo.plz;
      else if (l.includes("ort")) dd.textContent = demo.ort;
      else if (l.includes("straße") || l.includes("strasse") || l.includes("hausnummer")) {
        dd.textContent = demo.strasse;
      } else if (l.includes("e-mail") || l.includes("email")) dd.textContent = demo.email;
      else if (l === "name") dd.textContent = demo.name;
    });
  });
}

async function captureShot(page, filePath, clip = null) {
  await anonymizePageForScreenshot(page);
  await mkdir(path.dirname(filePath), { recursive: true });
  if (clip) {
    await page.screenshot({ path: filePath, clip, animations: "disabled" });
  } else {
    await page.screenshot({ path: filePath, fullPage: false, animations: "disabled" });
  }
}

async function capturePortalAngeboteSlide(page, base, vp, primaryEmail, primaryPassword) {
  const vpLabel = vp.label;
  let angebotEmail = primaryEmail;
  let urls = await discoverKundeUrls(primaryEmail);
  if (!urls.angebot) {
    const alt = await discoverKundeWithVisibleAngebot();
    if (alt && alt.toLowerCase() !== primaryEmail.toLowerCase()) {
      angebotEmail = alt;
      const pwd = await ensureAuditPassword(alt);
      if (pwd) {
        await login(page, base, alt, pwd, "/portal/login", "/portal");
        urls = await discoverKundeUrls(alt);
      }
    }
  }
  await openPortalSection(page, base, "angebote", urls, vp);
  await captureShot(page, path.join(ONBOARDING_OUT, "portal", vpLabel, "03-angebote.png"));
  if (angebotEmail.toLowerCase() !== primaryEmail.toLowerCase()) {
    const pwd = primaryPassword || (await ensureAuditPassword(primaryEmail));
    if (!pwd) throw new Error(`Re-Login für ${primaryEmail} fehlgeschlagen`);
    await login(page, base, primaryEmail, pwd, "/portal/login", "/portal");
    if (page.url().includes("/portal/login")) {
      throw new Error(`Portal-Re-Login fehlgeschlagen: ${primaryEmail}`);
    }
  }
}

async function capturePortalAnfragenSlide(page, base, vp, primaryEmail, primaryPassword) {
  const vpLabel = vp.label;
  let anfrageEmail = primaryEmail;
  let urls = await discoverKundeUrls(primaryEmail);
  if (!urls.anfrage) {
    const alt = await discoverKundeWithOpenAnfrage();
    if (alt && alt.toLowerCase() !== primaryEmail.toLowerCase()) {
      anfrageEmail = alt;
      const pwd = await ensureAuditPassword(alt);
      if (pwd) {
        await login(page, base, alt, pwd, "/portal/login", "/portal");
        urls = await discoverKundeUrls(alt);
      }
    }
  }
  await openPortalSection(page, base, "anfragen", urls, vp);
  await captureShot(page, path.join(ONBOARDING_OUT, "portal", vpLabel, "02-anfragen.png"));
  if (anfrageEmail.toLowerCase() !== primaryEmail.toLowerCase()) {
    const pwd = primaryPassword || (await ensureAuditPassword(primaryEmail));
    if (!pwd) throw new Error(`Re-Login für ${primaryEmail} fehlgeschlagen`);
    await login(page, base, primaryEmail, pwd, "/portal/login", "/portal");
    if (page.url().includes("/portal/login")) {
      throw new Error(`Portal-Re-Login fehlgeschlagen: ${primaryEmail}`);
    }
  }
}

async function capturePortalLanding(browser, base, vp, email, password) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.isMobile,
    hasTouch: vp.isMobile,
    deviceScaleFactor: vp.isMobile ? 2 : 1,
    locale: "de-DE",
  });
  await ctx.addInitScript((c) => localStorage.setItem("bw_cookie_consent_v1", c), CONSENT);
  await ctx.addInitScript(() => {
    localStorage.setItem("bw_onboarding_portal_v1_completed", "1");
  });
  const page = await ctx.newPage();

  const pwd = password || (await ensureAuditPassword(email));
  if (!pwd) throw new Error("Portal-Login nicht möglich");
  await login(page, base, email, pwd, "/portal/login", "/portal");

  await page.goto(`${base}/portal?section=uebersicht`, GOTO_OPTS);
  await page.waitForTimeout(1200);
  await captureShot(page, path.join(LANDING_OUT, `portal-${vp.label}.png`));

  await ctx.close();
  console.log(`✓ Portal Landing ${vp.label}`);
}

async function capturePortalSet(browser, base, vp, email, password) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.isMobile,
    hasTouch: vp.isMobile,
    deviceScaleFactor: vp.isMobile ? 2 : 1,
    locale: "de-DE",
  });
  await ctx.addInitScript((c) => localStorage.setItem("bw_cookie_consent_v1", c), CONSENT);
  await ctx.addInitScript(() => {
    localStorage.setItem("bw_onboarding_portal_v1_completed", "1");
  });
  const page = await ctx.newPage();

  const pwd = password || (await ensureAuditPassword(email));
  if (!pwd) throw new Error("Portal-Login nicht möglich");
  await login(page, base, email, pwd, "/portal/login", "/portal");

  const urls = await discoverKundeUrls(email);
  const vpLabel = vp.label;

  await page.goto(`${base}/portal?section=uebersicht`, GOTO_OPTS);
  await page.waitForTimeout(1200);
  await captureShot(page, path.join(LANDING_OUT, `portal-${vpLabel}.png`));
  await captureShot(
    page,
    path.join(ONBOARDING_OUT, "portal", vpLabel, "01-uebersicht.png")
  );

  await capturePortalAnfragenSlide(page, base, vp, email, pwd);

  await capturePortalAngeboteSlide(page, base, vp, email, pwd);

  await openPortalSection(page, base, "auftraege", urls, vp);
  await scrollToText(page, "Bautagebuch");
  await scrollToText(page, "Unterlagen");
  await captureShot(page, path.join(ONBOARDING_OUT, "portal", vpLabel, "04-auftraege.png"));

  if (vp.isMobile) {
    const gptBtn = page.getByRole("button", { name: /GPT öffnen/i });
    await page.goto(`${base}/portal?section=uebersicht`, GOTO_OPTS);
    await page.waitForTimeout(800);
    if (await gptBtn.isVisible().catch(() => false)) {
      await gptBtn.click();
      await page.waitForTimeout(1000);
      await captureShot(
        page,
        path.join(ONBOARDING_OUT, "portal", vpLabel, "05-gpt.png")
      );
    }
  } else {
    await gotoReady(page, `${base}/portal`);
    await switchSectionViaUi(page, "gpt", "portal", vp);
    await page.waitForTimeout(2000);
    await captureShot(
      page,
      path.join(ONBOARDING_OUT, "portal", vpLabel, "05-gpt.png")
    );
  }

  await ctx.close();
  console.log(`✓ Portal ${vpLabel}`);
}

async function capturePartnerSet(browser, base, vp, email, password) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.isMobile,
    hasTouch: vp.isMobile,
    deviceScaleFactor: vp.isMobile ? 2 : 1,
    locale: "de-DE",
  });
  await ctx.addInitScript((c) => localStorage.setItem("bw_cookie_consent_v1", c), CONSENT);
  await ctx.addInitScript(() => {
    localStorage.setItem("bw_onboarding_partner_v1_completed", "1");
  });
  const page = await ctx.newPage();

  const pwd = password || (await ensureAuditPassword(email));
  if (!pwd) throw new Error("Partner-Login nicht möglich");
  await login(page, base, email, pwd, "/partner/login", "/partner");

  const urls = await discoverPartnerUrls(email);
  const vpLabel = vp.label;

  await page.goto(`${base}/partner?section=uebersicht`, GOTO_OPTS);
  await page.waitForTimeout(1200);
  await captureShot(page, path.join(LANDING_OUT, `partner-${vpLabel}.png`));
  await captureShot(
    page,
    path.join(ONBOARDING_OUT, "partner", vpLabel, "01-uebersicht.png")
  );

  await openPartnerSection(page, base, "anfragen", urls, vp);
  await captureShot(page, path.join(ONBOARDING_OUT, "partner", vpLabel, "02-anfragen.png"));

  await openPartnerSection(page, base, "angebote", urls, vp);
  await scrollToText(page, "Angebots-PDF");
  await captureShot(page, path.join(ONBOARDING_OUT, "partner", vpLabel, "03-angebote.png"));

  await openPartnerSection(page, base, "auftraege", urls, vp);
  await scrollToText(page, "Bautagebuch");
  await captureShot(page, path.join(ONBOARDING_OUT, "partner", vpLabel, "04-auftraege.png"));

  await ctx.close();
  console.log(`✓ Partner ${vpLabel}`);
}

async function main() {
  loadEnvLocal();
  const base = await resolveBaseUrl();
  const kundeEmail =
    process.env.AUDIT_KUNDE_EMAIL ||
    (await discoverBestKundeForRichData()) ||
    (await discoverBestKundeEmail()) ||
    process.env.INTERN_EMAIL;
  const partnerEmail =
    process.env.AUDIT_PARTNER_EMAIL ||
    (await discoverBestPartnerEmail()) ||
    process.env.INTERN_EMAIL;
  const kundePassword = process.env.AUDIT_KUNDE_PASSWORD;
  const partnerPassword = process.env.AUDIT_PARTNER_PASSWORD;

  if (!kundeEmail || !partnerEmail) {
    throw new Error("INTERN_EMAIL oder AUDIT_*_EMAIL in .env.local setzen.");
  }

  console.log(`Capture → ${LANDING_OUT} + ${ONBOARDING_OUT}`);
  console.log(`Kunde: ${kundeEmail} · Partner: ${partnerEmail}`);
  const browser = await chromium.launch({ headless: true });

  const only = process.env.CAPTURE_ONLY?.trim();
  const landingOnly = process.env.CAPTURE_LANDING_ONLY?.trim();
  const viewports = only?.endsWith("-mobile")
    ? [VIEWPORTS.mobile]
    : only?.endsWith("-desktop")
      ? [VIEWPORTS.desktop]
      : Object.values(VIEWPORTS);

  for (const vp of viewports) {
    if (landingOnly === "portal") {
      await capturePortalLanding(browser, base, vp, kundeEmail, kundePassword);
      continue;
    }
    if (!only || only.startsWith("portal")) {
      await capturePortalSet(browser, base, vp, kundeEmail, kundePassword);
    }
    if (!only || only.startsWith("partner")) {
      await capturePartnerSet(browser, base, vp, partnerEmail, partnerPassword);
    }
  }

  await writeFile(
    path.join(ONBOARDING_OUT, "manifest.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl: base }, null, 2)
  );

  await browser.close();
  console.log("Fertig.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
