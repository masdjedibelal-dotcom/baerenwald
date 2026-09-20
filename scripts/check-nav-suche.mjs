#!/usr/bin/env node
/**
 * Guard: Navigation & Suche (Portal N3–N8 / Phase B–D)
 *
 * Prints:
 *   suche_logiken=<n>          — distinct usePortalSearch apiPath / fetch paths in shared search UI
 *   nav_label_abweichungen=<n> — family home/liste/objekte/settings must share label across roles
 *
 * Target: suche_logiken=1 (eine Komponente/Hook für Header), nav_label_abweichungen=0
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".") || name === "node_modules") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

function read(p) {
  try {
    return readFileSync(p, "utf8");
  } catch {
    return "";
  }
}

/** Distinct search fetch entry points used by PortalHeaderSearch / usePortalSearch consumers. */
function countSucheLogiken() {
  const header = read(join(SRC, "components/shared/PortalHeaderSearch.tsx"));
  const hook = read(join(SRC, "hooks/usePortalSearch.ts"));
  const orgSuche = read(join(SRC, "components/org/OrganisationSuche.tsx"));
  // One shared hook + HeaderSearch (OrganisationSuche reuses HeaderSearch) = 1 logic
  const headerUsesHook = /usePortalSearch/.test(header);
  const hookFetches = /fetch\s*\(/.test(hook) && /apiPath/.test(hook);
  const orgReusesHeader = /PortalHeaderSearch/.test(orgSuche);
  if (headerUsesHook && hookFetches && orgReusesHeader) {
    return 1;
  }
  // Fallback: count distinct `/api/*/suche` fetch strings in components (ohne shared hook)
  const files = walk(join(SRC, "components"));
  const paths = new Set();
  for (const f of files) {
    const t = read(f);
    const re = /fetch\(\s*[`'"](\/api\/[^`'"]*suche[^`'"]*)[`'"]/g;
    let m;
    while ((m = re.exec(t))) paths.add(m[1].split("?")[0]);
  }
  return paths.size || 99;
}

function countNavLabelAbweichungen() {
  const navFile = join(SRC, "lib/portal2/nav-items.ts");
  const src = read(navFile);
  if (!src) return 99;

  // Evaluate family labels via dynamic import isn't possible in plain node without tsx.
  // Parse PORTAL_NAV_ITEMS blocks for keys home/liste/objekte/settings.
  const familyKeys = ["home", "liste", "objekte", "settings"];
  const byKey = new Map();

  // Match items like: { key: "home", label: "…" } or label: PORTAL_NAV_FAMILY_LABELS.home
  const itemRe =
    /\{\s*key:\s*"(home|liste|objekte|settings)"\s*,\s*label:\s*(?:PORTAL_NAV_FAMILY_LABELS\.(home|liste|objekte|settings)|"([^"]+)")/g;
  let m;
  while ((m = itemRe.exec(src))) {
    const key = m[1];
    const label = m[3] || m[2]; // FAMILY ref → use key name as canonical token
    const canonical = m[2] ? `__family__${m[2]}` : label;
    if (!byKey.has(key)) byKey.set(key, new Set());
    byKey.get(key).add(canonical);
  }

  // Also require PORTAL_NAV_FAMILY_LABELS exists with expected German labels
  const expected = {
    home: "Übersicht",
    liste: "Vorgänge",
    objekte: "Objekte",
    settings: "Einstellungen",
  };
  let abweichungen = 0;
  for (const key of familyKeys) {
    const set = byKey.get(key);
    if (!set || set.size === 0) {
      abweichungen += 1;
      continue;
    }
    // All entries must be the same family token OR the same literal
    if (set.size > 1) abweichungen += set.size - 1;
    const only = [...set][0];
    if (only.startsWith("__family__")) {
      const fam = only.replace("__family__", "");
      if (fam !== key) abweichungen += 1;
      const litRe = new RegExp(
        `${key}:\\s*"([^"]+)"`
      );
      // check PORTAL_NAV_FAMILY_LABELS block
    }
  }

  // Verify family constant strings
  for (const [k, v] of Object.entries(expected)) {
    const re = new RegExp(`${k}:\\s*"${v}"`);
    if (!re.test(src)) abweichungen += 1;
  }

  // mieter must not appear as nav role key in PORTAL_NAV_ITEMS
  if (/^\s*mieter:\s*\[/m.test(src)) abweichungen += 1;

  return abweichungen;
}

const suche = countSucheLogiken();
const navAbw = countNavLabelAbweichungen();

console.log(`suche_logiken=${suche}`);
console.log(`nav_label_abweichungen=${navAbw}`);

if (suche !== 1 || navAbw !== 0) {
  console.error(
    `\nGuard failed (target: suche_logiken=1, nav_label_abweichungen=0)`
  );
  process.exit(1);
}
console.log("\ncheck-nav-suche OK");
