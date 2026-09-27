#!/usr/bin/env node
/**
 * Guard: Auswahl-Zustand
 * - Kein aria-pressed in src/components/ (Fake-Checkboxen / Toggle-Missbrauch)
 * - Keine neue unlayered CSS-Regel mit --active / --selected im Selektor
 *   (außer Allowlist — darf nicht wachsen)
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const COMPONENTS = path.join(ROOT, 'src', 'components')
const GLOBALS = path.join(ROOT, 'src', 'app', 'globals.css')
const ALLOWLIST_PATH = path.join(__dirname, 'auswahl-zustand-allowlist.txt')
/** Festgeschrieben: Ausnahmeliste darf nicht wachsen. */
const ALLOWLIST_MAX_LINES = 2

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === '.next') continue
      walk(p, acc)
    } else if (/\.(tsx|ts|jsx|js)$/.test(ent.name)) acc.push(p)
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

function checkAriaPressed() {
  const hits = []
  for (const file of walk(COMPONENTS)) {
    const text = fs.readFileSync(file, 'utf8')
    const lines = text.split('\n')
    lines.forEach((line, i) => {
      if (/\baria-pressed\b/.test(line)) {
        const rel = path.relative(ROOT, file).replace(/\\/g, '/')
        hits.push(`${rel}:${i + 1}`)
      }
    })
  }
  return hits
}

/**
 * Unlayered Regelblöcke in globals.css, deren Selektor --active oder --selected enthält.
 */
function checkUnlayeredActiveSelected() {
  const text = fs.readFileSync(GLOBALS, 'utf8')
  const lines = text.split('\n')
  const hits = []
  let brace = 0
  let insideLayer = false
  let layerStartDepth = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const stripped = line.trim()

    if (/^@layer\b/.test(stripped) && stripped.includes('{')) {
      insideLayer = true
      layerStartDepth = brace
    }

    const opens = (line.match(/\{/g) || []).length
    const closes = (line.match(/\}/g) || []).length

    if (opens && !insideLayer && brace === 0) {
      // Sammle Selektor + Block
      let depth = 0
      let block = ''
      let selectorLines = []
      for (let k = i; k < lines.length; k++) {
        const L = lines[k]
        if (depth === 0) selectorLines.push(L)
        block += L + '\n'
        depth += (L.match(/\{/g) || []).length
        depth -= (L.match(/\}/g) || []).length
        if (depth === 0 && block.includes('{')) {
          const selector = selectorLines.join(' ').replace(/\s+/g, ' ').trim()
          if (/--(?:active|selected)\b/.test(selector)) {
            hits.push({
              line: i + 1,
              selector: selector.slice(0, 160),
            })
          }
          break
        }
      }
    }

    brace += opens - closes
    if (
      insideLayer &&
      layerStartDepth !== null &&
      brace <= layerStartDepth &&
      closes
    ) {
      if (brace === layerStartDepth) {
        insideLayer = false
        layerStartDepth = null
      }
    }
  }
  return hits
}

function main() {
  const allow = loadAllowlist()
  if (allow.length > ALLOWLIST_MAX_LINES) {
    console.error(
      `[check-auswahl-zustand] Allowlist zu groß: ${allow.length} > max ${ALLOWLIST_MAX_LINES}`
    )
    process.exit(1)
  }

  const ariaHits = checkAriaPressed()
  if (ariaHits.length) {
    console.error('[check-auswahl-zustand] aria-pressed in src/components/ — durch PortalCheckbox / switch ersetzen:')
    for (const h of ariaHits) console.error(`  ${h}`)
    process.exit(1)
  }

  const unlayered = checkUnlayeredActiveSelected()
  const violations = unlayered.filter(
    (h) => !allow.some((a) => h.selector.includes(a))
  )
  if (violations.length) {
    console.error(
      '[check-auswahl-zustand] Unlayered Regel mit --active/--selected — gehört in @layer components:'
    )
    for (const v of violations) {
      console.error(`  globals.css:${v.line}  ${v.selector}`)
    }
    process.exit(1)
  }

  console.log(
    `[check-auswahl-zustand] OK — aria-pressed=0; unlayered --active/--selected allowlist=${allow.length}/${ALLOWLIST_MAX_LINES}`
  )
  process.exit(0)
}

main()
