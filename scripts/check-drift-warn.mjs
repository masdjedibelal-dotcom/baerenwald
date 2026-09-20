#!/usr/bin/env node
/**
 * P0-5: Drift-Zähler (Warnung, bricht Build nicht).
 * Zählt Hex außerhalb Token-CSS, Tailwind-Standardfarben, rohe <button>,
 * Modal-Importe, DB-Abfragen ohne error-Auswertung.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = path.join(root, 'src')

const TOKEN_CSS = new Set([
  'src/app/globals.css',
  'src/styles',
])

const TW_COLORS =
  /\b(?:bg|text|border|ring|from|to|via|outline|fill|stroke)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g

const HEX = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g
const RAW_BUTTON = /<button\b/g
const MODAL_IMPORT =
  /from\s+['"][^'"]*(?:\/Modal['"]|\/MockModal['"]|ui\/Modal|mock-ui\/MockModal)/g
const DATA_NO_ERROR =
  /const\s*\{\s*data\s*(?:,\s*error)?\s*\}\s*=\s*await\b/g
const DATA_ONLY =
  /const\s*\{\s*data\s*\}\s*=\s*await\b/g

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === '.next') continue
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, acc)
    else if (/\.(tsx|ts|css|jsx|js)$/.test(ent.name)) acc.push(p)
  }
  return acc
}

function isTokenFile(rel) {
  if (TOKEN_CSS.has(rel)) return true
  if (rel.startsWith('src/app/') && rel.endsWith('globals.css')) return true
  if (rel.includes('mock-design-system')) return true
  if (rel.includes('/tokens')) return true
  if (rel.endsWith('design-tokens.css')) return true
  return false
}

function countMatches(text, re) {
  const m = text.match(re)
  return m ? m.length : 0
}

const files = walk(srcDir)
let hex = 0
let tw = 0
let buttons = 0
let modals = 0
let dataOnly = 0
let dataWithErrorBind = 0

for (const abs of files) {
  const rel = path.relative(root, abs).split(path.sep).join('/')
  const text = fs.readFileSync(abs, 'utf8')
  if (!isTokenFile(rel)) {
    hex += countMatches(text, HEX)
    tw += countMatches(text, TW_COLORS)
  }
  if (/\.(tsx|jsx)$/.test(rel)) {
    buttons += countMatches(text, RAW_BUTTON)
  }
  if (/\.(tsx|ts)$/.test(rel)) {
    modals += countMatches(text, MODAL_IMPORT)
    dataOnly += countMatches(text, DATA_ONLY)
    dataWithErrorBind += countMatches(text, DATA_NO_ERROR)
  }
}

const report = {
  repo: path.basename(root),
  hexOutsideTokens: hex,
  tailwindPaletteClasses: tw,
  rawButtonElements: buttons,
  modalImports: modals,
  awaitDataWithoutErrorDestructure: dataOnly,
  awaitDataWithOptionalError: dataWithErrorBind,
}

console.log('[drift-warn] P0-5 Drift-Zähler (Build bricht nicht)')
for (const [k, v] of Object.entries(report)) {
  console.log(`  ${k}: ${v}`)
}

// Immer exit 0 — nur Warnung
process.exit(0)
