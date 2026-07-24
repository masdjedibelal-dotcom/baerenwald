#!/usr/bin/env node
/**
 * Portal 2.0 A5 — Build-Guards für MockIcon
 *
 * Guard 1: Jeder PORTAL_GLYPH_TO_ICON-Wert existiert in ICON_MAP;
 *          jeder PORTAL_NAV_ICONS-Wert ebenfalls.
 * Guard 2: Jede <MockIcon …> Nutzung enthält Pflicht-Attribut ctx=
 *          (Scan unter src/components + src/app, ausgenommen MockIcon.tsx selbst).
 */

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exitCode = 1;
}

function ok(msg) {
  console.log(`✓ ${msg}`);
}

// --- Guard 1: Mapping-Konsistenz (ohne TS-Import: Regex auf Quelldatei) ---
const iconsFile = path.join(root, "src/lib/portal2/mock-icons.ts");
const iconsSrc = fs.readFileSync(iconsFile, "utf8");

function extractConstKeys(src, constName) {
  const re = new RegExp(`export const ${constName} = \\{([\\s\\S]*?)\\} as const`);
  const m = src.match(re);
  if (!m) return null;
  const body = m[1];
  const keys = [];
  const keyRe = /(?:^|\n)\s*(?:\/\/[^\n]*\n\s*)*(?:'([^']+)'|"([^"]+)"|([A-Za-z0-9_-]+))\s*:/g;
  let km;
  while ((km = keyRe.exec(body))) {
    keys.push(km[1] || km[2] || km[3]);
  }
  return keys;
}

function extractStringValuesInConst(src, constName) {
  const re = new RegExp(`export const ${constName} = \\{([\\s\\S]*?)\\} as const`);
  const m = src.match(re);
  if (!m) return null;
  const vals = [];
  const vRe = /:\s*"([^"]+)"/g;
  let vm;
  while ((vm = vRe.exec(m[1]))) vals.push(vm[1]);
  return vals;
}

const iconKeys = extractConstKeys(iconsSrc, "ICON_MAP");
const glyphVals = extractStringValuesInConst(iconsSrc, "PORTAL_GLYPH_TO_ICON");
const navVals = extractStringValuesInConst(iconsSrc, "PORTAL_NAV_ICONS");

if (!iconKeys?.length) {
  fail("ICON_MAP nicht parsebar");
} else {
  ok(`ICON_MAP: ${iconKeys.length} Einträge`);
}

const iconSet = new Set(iconKeys || []);
for (const v of glyphVals || []) {
  if (!iconSet.has(v)) fail(`Glyph mappt auf unbekanntes Icon "${v}"`);
}
if (glyphVals?.length) ok(`PORTAL_GLYPH_TO_ICON: ${glyphVals.length} → ICON_MAP ok`);

for (const v of navVals || []) {
  if (!iconSet.has(v)) fail(`NAV mappt auf unbekanntes Icon "${v}"`);
}
if (navVals?.length) ok(`PORTAL_NAV_ICONS: ${navVals.length} → ICON_MAP ok`);

// --- Guard 2: MockIcon ohne ctx= ---
function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".next") continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.(tsx|jsx)$/.test(ent.name)) out.push(p);
  }
  return out;
}

const files = [
  ...walk(path.join(root, "src/components")),
  ...walk(path.join(root, "src/app")),
].filter((f) => !f.endsWith(`${path.sep}MockIcon.tsx`));

const missingCtx = [];
const tagRe = /<MockIcon\b([^>]*?)(?:\/>|>)/g;
for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  let m;
  while ((m = tagRe.exec(src))) {
    const attrs = m[1] || "";
    if (!/\bctx\s*=/.test(attrs)) {
      missingCtx.push(`${path.relative(root, file)}: <MockIcon ohne ctx>`);
    }
  }
}

if (missingCtx.length) {
  for (const line of missingCtx) fail(line);
} else {
  ok("Alle <MockIcon> Nutzungen haben ctx=");
}

if (process.exitCode) {
  console.error("\nPortal2 Icon Build-Guards fehlgeschlagen.");
  process.exit(1);
}
console.log("\nPortal2 Icon Build-Guards bestanden.");
