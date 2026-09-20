#!/usr/bin/env node
/**
 * P1-7: Keine hart kodierten Supabase-Projekt-Refs in App-Code (src/).
 * Erlaubt: docs/, netlify.toml, scripts/lib/prod-guard.*, .env.example, .cursor/
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const REFS = ['wnotlydvhsmfkhexgeol', 'soqownnkxmtfgvsbrgsl']

const ALLOW_DIR_PREFIX = [
  'docs/',
  '.cursor/',
  'supabase/',
  'e2e/reports/',
]

const ALLOW_FILES = new Set([
  'netlify.toml',
  '.env.example',
  '.env.staging.example',
  'scripts/lib/prod-guard.mjs',
  'scripts/lib/prod-guard.sh',
  'scripts/check-no-hardcoded-supabase-ref.mjs',
])

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      ent.name === 'node_modules' ||
      ent.name === '.next' ||
      ent.name === '.git'
    )
      continue
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, acc)
    else acc.push(p)
  }
  return acc
}

const offenders = []
for (const abs of walk(root)) {
  const rel = path.relative(root, abs).split(path.sep).join('/')
  if (ALLOW_FILES.has(rel)) continue
  if (ALLOW_DIR_PREFIX.some((p) => rel.startsWith(p))) continue
  // Ops-Skripte dürfen Refs noch haben — schrittweise auf Env; hier nur src/ hart
  if (!rel.startsWith('src/')) continue
  if (!/\.(ts|tsx|js|mjs|jsx|css|json)$/.test(rel)) continue
  const text = fs.readFileSync(abs, 'utf8')
  for (const ref of REFS) {
    if (text.includes(ref)) {
      offenders.push(`${rel} (${ref})`)
    }
  }
}

if (offenders.length) {
  console.error('[check-no-hardcoded-supabase-ref] P1-7 FEHLER in src/:')
  for (const o of offenders) console.error('  -', o)
  console.error('  → STAGING_PROJECT_REF / STAGING_SUPABASE_URL aus Env nutzen.')
  process.exit(1)
}
console.log('[check-no-hardcoded-supabase-ref] OK — keine Refs in src/')
process.exit(0)
