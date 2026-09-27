#!/usr/bin/env node
/**
 * Guard: Partner- und Kundenseite dürfen keine fremden Preisfelder tragen.
 *
 * - src/components/partner/: kein stundensatz_kunde, kein preis_fix
 * - kundenseitig (portal/org/shared): kein preis_partner
 *
 * Ausnahmen nur über scripts/preis-seiten-allowlist.txt (darf nicht wachsen).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const ALLOWLIST_PATH = path.join(__dirname, 'preis-seiten-allowlist.txt')
/** Festgeschrieben: Ausnahmeliste darf nicht wachsen. */
const ALLOWLIST_MAX_LINES = 0

const PARTNER_DIR = path.join(ROOT, 'src/components/partner')
const KUNDE_DIRS = [
  path.join(ROOT, 'src/components/portal'),
  path.join(ROOT, 'src/components/org'),
  path.join(ROOT, 'src/components/shared'),
]

const PARTNER_FORBIDDEN = [
  { id: 'stundensatz_kunde', re: /\bstundensatz_kunde\b/g },
  { id: 'preis_fix', re: /\bpreis_fix\b/g },
]
const KUNDE_FORBIDDEN = [
  { id: 'preis_partner', re: /\bpreis_partner\b/g },
  // Partner-Aufgabe nur im Partnerportal (Darstellung)
  { id: 'partner_aufgabe_id', re: /\bpartner_aufgabe_id\b/g },
  { id: 'partner_aufgabe_titel', re: /\bpartner_aufgabe_titel\b/g },
  {
    id: 'partner_aufgabe_beschreibung',
    re: /\bpartner_aufgabe_beschreibung\b/g,
  },
]

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === '.next') continue
      walk(p, acc)
    } else if (/\.(tsx?|jsx?)$/.test(ent.name)) acc.push(p)
  }
  return acc
}

function loadAllowlist() {
  if (!fs.existsSync(ALLOWLIST_PATH)) return []
  return fs
    .readFileSync(ALLOWLIST_PATH, 'utf8')
    .split('\n')
    .map((l) => l.replace(/#.*$/, '').trim())
    .filter(Boolean)
}

function isAllowed(rel, allow) {
  return allow.some((a) => a === rel || rel.startsWith(a + ':'))
}

const allow = loadAllowlist()
if (allow.length > ALLOWLIST_MAX_LINES) {
  console.error(
    `[check-preis-seiten] Allowlist hat ${allow.length} Einträge — Maximum ${ALLOWLIST_MAX_LINES}. Nur schrumpfen.`
  )
  process.exit(1)
}

const violations = []

function scan(files, rules, seite) {
  for (const file of files) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/')
    const content = fs.readFileSync(file, 'utf8')
    for (const rule of rules) {
      rule.re.lastIndex = 0
      let m
      while ((m = rule.re.exec(content))) {
        const line = content.slice(0, m.index).split('\n').length
        const key = `${rel}:${line}`
        if (isAllowed(rel, allow) || isAllowed(key, allow)) continue
        violations.push({ rel, line, id: rule.id, seite })
      }
    }
  }
}

scan(walk(PARTNER_DIR), PARTNER_FORBIDDEN, 'partner')
for (const dir of KUNDE_DIRS) {
  scan(walk(dir), KUNDE_FORBIDDEN, 'kunde')
}

if (violations.length) {
  console.error('Preis-Seiten-Guard fehlgeschlagen:')
  for (const v of violations) {
    console.error(`  [${v.seite}] ${v.rel}:${v.line} → ${v.id}`)
  }
  process.exit(1)
}

console.log('OK: Preis-Seiten getrennt (Partner ≠ Kunde)')
