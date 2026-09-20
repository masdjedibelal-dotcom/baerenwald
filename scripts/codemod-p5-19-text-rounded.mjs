#!/usr/bin/env node
/**
 * P5-19 Portal: text-[Npx] → text-fs-*; rounded → rounded-{card|button|field|pill|sheet}
 * CSS font-size px → var(--p2-fs-*)
 * Usage: node scripts/codemod-p5-19-text-rounded.mjs [--dry]
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const DRY = process.argv.includes('--dry')
const SRC = join(ROOT, 'src')

/** Portal: 10–12→caption, 13→meta, 14→body, 15–17→title, ≥18→head */
function mapTextPx(n) {
  if (n <= 12) return 'text-fs-caption'
  if (n <= 13) return 'text-fs-meta'
  if (n <= 14) return 'text-fs-body'
  if (n <= 17) return 'text-fs-title'
  return 'text-fs-head'
}

function mapFsToken(n) {
  if (n <= 12) return '--p2-fs-caption'
  if (n <= 13) return '--p2-fs-meta'
  if (n <= 14) return '--p2-fs-body'
  if (n <= 17) return '--p2-fs-title'
  return '--p2-fs-head'
}

function mapRounded(token, ctx) {
  const c = ctx.toLowerCase()
  if (token === 'rounded-full' || /\b(pill|chip|badge|tag|avatar|dot)\b/.test(c)) return 'rounded-pill'
  if (/\b(sheet|drawer|modal|dialog)\b/.test(c)) return 'rounded-sheet'
  if (/\b(btn|button|portalbutton|portal-btn)\b/.test(c)) return 'rounded-button'
  if (/\b(input|select|textarea|field|control)\b/.test(c)) return 'rounded-field'
  if (token === 'rounded-xl' || token === 'rounded-2xl' || token === 'rounded-3xl') return 'rounded-sheet'
  if (token === 'rounded-sm' || token === 'rounded-md') return 'rounded-field'
  if (token === 'rounded-lg' || token === 'rounded') return 'rounded-card'
  return 'rounded-card'
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(tsx|ts|css)$/.test(name)) out.push(p)
  }
  return out
}

const TEXT_RE = /text-\[(\d+(?:\.\d+)?)px\]/g
/** Nur Tailwind-Klassen: nicht Object-Keys wie `rounded: true` */
const ROUNDED_RE =
  /(?<=["'`\s])rounded(?:-(?:sm|md|lg|xl|2xl|3xl|full))?(?=["'`\s])(?!\s*=)/g
const ALLOWED = new Set([
  'rounded-card',
  'rounded-button',
  'rounded-field',
  'rounded-pill',
  'rounded-sheet',
])

let textHits = 0
let roundedHits = 0
let filesChanged = 0

for (const file of walk(SRC)) {
  let src = readFileSync(file, 'utf8')
  const orig = src

  if (/\.(tsx|ts)$/.test(file)) {
    src = src.replace(TEXT_RE, (_, n) => {
      textHits++
      return mapTextPx(Number(n))
    })

    let out = ''
    let last = 0
    ROUNDED_RE.lastIndex = 0
    let m
    while ((m = ROUNDED_RE.exec(src))) {
      const tok = m[0]
      if (ALLOWED.has(tok)) continue
      const start = Math.max(0, m.index - 80)
      const end = Math.min(src.length, m.index + tok.length + 80)
      const ctx = src.slice(start, end)
      const repl = mapRounded(tok, ctx)
      out += src.slice(last, m.index) + repl
      last = m.index + tok.length
      roundedHits++
    }
    out += src.slice(last)
    src = out
  }

  // Komponenten-CSS: font-size px → Token (globals.css = Token-Quelle, unverändert)
  if (/\.css$/.test(file) && !file.endsWith(`${join('app', 'globals.css')}`) && !/\/globals\.css$/.test(file)) {
    src = src.replace(/(?<!calc\()font-size:\s*(\d+(?:\.\d+)?)px\b/g, (full, nStr) => {
      textHits++
      return `font-size: var(${mapFsToken(Number(nStr))})`
    })
  }

  if (src !== orig) {
    filesChanged++
    if (!DRY) writeFileSync(file, src)
    console.log(`${DRY ? '[dry] ' : ''}${relative(ROOT, file)}`)
  }
}

console.log(`text/fs hits≈${textHits} rounded≈${roundedHits} files=${filesChanged}${DRY ? ' (dry)' : ''}`)
