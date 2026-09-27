#!/usr/bin/env node
/**
 * Guard: ungebundene Kennungen in Server-Actions und API-Routen.
 *
 * A) Exportierte Action in src/app/actions/ mit supabaseAdmin:
 *    vor dem ersten supabaseAdmin muss eine Sitzungs-/Assert-Funktion stehen.
 *
 * B) Route-Handler unter src/app/api/ mit Client-Kennung (searchParams/params/json)
 *    und supabaseAdmin: zwischen Entnahme und Admin-Query muss assert* stehen
 *    ODER eine klare Session-Bindung (.eq kunde_id / handwerker_id / user.id).
 *    Unklare Fälle → überspringen und zählen (Fehlalarme > Lücken).
 *
 * Bewusste Ausnahmen: scripts/action-gates-allowlist.txt (darf nicht wachsen).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ACTIONS_DIR = path.join(ROOT, "src", "app", "actions");
const API_DIR = path.join(ROOT, "src", "app", "api");
const ALLOWLIST_PATH = path.join(__dirname, "action-gates-allowlist.txt");
/** Festgeschrieben: Ausnahmeliste darf nicht wachsen. */
const ALLOWLIST_MAX_LINES = 18;

const GATE_CALL =
  /\b(requireOrganisationSession|requireOrgAdminSession|requireOrgFreigabeSession|requireAccountSession|requireEigentuemerSession|requireBefundActor|requireBefundWrite|requireOrgWrite|requireHandwerkerId|assertOrgObjekt|assertOrgEinheit|assertOrgLead|assertPartnerAktiveZuweisung|assertPartnerEmailAllowed|assertPortalEmailAllowed|assertProtokollIdForAuftrag|assertKundeLead|assertKundeAuftrag|assertBefundForActor|assertLeadForBefundActor|assertPartnerAuftrag|assertPartnerAuftragAccess|partnerAuth|linkPortalHandwerkerToAuthUser|linkPortalKundeToAuthUser|filterPartnerOwnedStoragePaths|verifyFunnelOtp|verifyPartnerRegistrationEmail|createClient|checkRateLimit)\s*\(/;

const ASSERT_CALL = /\bassert[A-Z][A-Za-z0-9_]*\s*\(/;

const SESSION_BIND =
  /\.eq\(\s*["'](kunde_id|handwerker_id|auftraggeber_kunde_id|empfaenger_user_id|auth_user_id|org_kunde_id)["']|\.eq\(\s*["'][^"']+["']\s*,\s*(session|user)\.|filterPartnerOwnedStoragePaths/;

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".next") continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx)$/.test(ent.name)) acc.push(p);
  }
  return acc;
}

function loadAllowlist() {
  if (!fs.existsSync(ALLOWLIST_PATH)) return [];
  return fs
    .readFileSync(ALLOWLIST_PATH, "utf8")
    .split("\n")
    .map((l) => l.replace(/#.*$/, "").trim())
    .filter(Boolean);
}

/** Body einer `export async function name(...)` inkl. Return-Typ mit `{`. */
function extractExportedAsyncFns(text) {
  const fns = [];
  const re = /export\s+async\s+function\s+(\w+)\s*\(/g;
  let m;
  while ((m = re.exec(text))) {
    let i = m.index + m[0].length - 1; // '('
    let depth = 0;
    for (; i < text.length; i++) {
      const c = text[i];
      if (c === "(") depth++;
      else if (c === ")") {
        depth--;
        if (depth === 0) {
          i++;
          break;
        }
      }
    }
    while (i < text.length && text[i] !== "{") i++;
    if (text[i] !== "{") continue;
    const bodyStart = i;
    depth = 0;
    for (; i < text.length; i++) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}") {
        depth--;
        if (depth === 0) {
          i++;
          break;
        }
      }
    }
    fns.push({ name: m[1], body: text.slice(bodyStart, i) });
  }
  return fns;
}

function firstIndex(re, text) {
  const m = text.match(re);
  return m ? m.index : -1;
}

function checkActions(allow) {
  const offenders = [];
  for (const abs of walk(ACTIONS_DIR)) {
    const rel = path.relative(ROOT, abs).split(path.sep).join("/");
    const text = fs.readFileSync(abs, "utf8");
    if (!/"use server"/.test(text) && !/'use server'/.test(text)) continue;

    for (const fn of extractExportedAsyncFns(text)) {
      const key = `${rel}:${fn.name}`;
      if (allow.has(key) || allow.has(rel)) continue;

      const adminIdx = firstIndex(/supabaseAdmin\b/, fn.body);
      if (adminIdx < 0) continue;

      const gateIdx = firstIndex(GATE_CALL, fn.body);
      if (gateIdx < 0 || gateIdx > adminIdx) {
        offenders.push(key);
      }
    }
  }
  return offenders;
}

function checkRoutes(allow) {
  const offenders = [];
  let skipped = 0;

  for (const abs of walk(API_DIR)) {
    const rel = path.relative(ROOT, abs).split(path.sep).join("/");
    if (allow.has(rel)) continue;
    const text = fs.readFileSync(abs, "utf8");
    if (!/supabaseAdmin\b/.test(text)) continue;

    for (const fn of extractExportedAsyncFns(text)) {
      if (!/^(GET|POST|PUT|PATCH|DELETE)$/.test(fn.name)) continue;
      const key = `${rel}:${fn.name}`;
      if (allow.has(key)) continue;

      const body = fn.body;
      if (!/supabaseAdmin\b/.test(body)) continue;

      const hasClient =
        /searchParams\.get\s*\(/.test(body) ||
        /\bparams\b/.test(body) ||
        /await\s+req\.json\s*\(/.test(body) ||
        /await\s+request\.json\s*\(/.test(body);
      if (!hasClient) continue;

      if (ASSERT_CALL.test(body)) continue;
      if (SESSION_BIND.test(body) && GATE_CALL.test(body)) continue;

      // Ohne klare Assert- oder Bindungs-Heuristik: überspringen (kein Fehlalarm)
      if (GATE_CALL.test(body)) {
        skipped++;
        continue;
      }

      offenders.push(key);
    }
  }

  return { offenders, skipped };
}

function main() {
  const allowLines = loadAllowlist();
  if (allowLines.length > ALLOWLIST_MAX_LINES) {
    console.error(
      `[check-action-gates] Allowlist hat ${allowLines.length} Einträge (max ${ALLOWLIST_MAX_LINES}). Nicht wachsen lassen.`
    );
    process.exit(1);
  }
  const allow = new Set(allowLines);

  const actionOff = checkActions(allow);
  const { offenders: routeOff, skipped } = checkRoutes(allow);
  const all = [...actionOff, ...routeOff].sort();

  if (all.length) {
    console.error("[check-action-gates] FEHLER — Gate fehlt oder nach Admin-Query:");
    for (const o of all) console.error(`  - ${o}`);
    process.exit(1);
  }

  console.log(
    `[check-action-gates] OK (Allowlist ${allowLines.length}/${ALLOWLIST_MAX_LINES}, Routen übersprungen ${skipped})`
  );
  process.exit(0);
}

main();
