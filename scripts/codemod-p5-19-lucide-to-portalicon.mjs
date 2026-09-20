#!/usr/bin/env node
/**
 * P5-19: lucide-react → PortalIcon (Portal).
 * Usage: node scripts/codemod-p5-19-lucide-to-portalicon.mjs [--dry]
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const DRY = process.argv.includes('--dry')
const SRC = join(ROOT, 'src')

/** Lucide-Komponente → PortalIcon `n` */
const LUCIDE_TO_N = {
  AlertCircle: 'alert-triangle',
  AlertTriangle: 'alert-triangle',
  ArrowLeftRight: 'arrows-exchange',
  Bath: 'bath',
  Calculator: 'calculator',
  Calendar: 'calendar',
  CalendarCheck2: 'calendar-check',
  CalendarDays: 'calendar-event',
  Camera: 'photo',
  Check: 'check',
  ChevronDown: 'chevron-down',
  ChevronLeft: 'chevron-left',
  ChevronRight: 'chevron-right',
  ChevronUp: 'chevron-up',
  ClipboardList: 'clipboard-list',
  Copy: 'copy',
  Download: 'download',
  Eye: 'eye',
  FileSearch: 'file-search',
  FileText: 'file-text',
  Filter: 'filter',
  Flower2: 'flower',
  Hammer: 'hammer',
  Handshake: 'handshake',
  HelpCircle: 'help',
  Home: 'home',
  ImageIcon: 'photo',
  ImagePlus: 'photo-plus',
  Info: 'info-circle',
  ListTodo: 'list-todo',
  Loader2: 'loader',
  MapPin: 'map-pin',
  MessageCircle: 'message',
  Mic: 'microphone',
  Minus: 'minus',
  Pencil: 'pencil',
  Plus: 'plus',
  Scale: 'scale',
  Search: 'search',
  Send: 'send',
  Shield: 'shield-check',
  Snowflake: 'snowflake',
  Sparkles: 'sparkles',
  Square: 'square',
  Store: 'store',
  Trash2: 'trash',
  Trees: 'trees',
  Upload: 'upload',
  UserPlus: 'user-plus',
  Wrench: 'wrench',
  X: 'x',
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.tsx$/.test(name)) out.push(p)
  }
  return out
}

function inferCtx(before) {
  const b = before.toLowerCase()
  if (/\bsidebar|bottomnav|shell/.test(b)) return 'sidebar'
  if (/\bnav|tab\b/.test(b)) return 'nav'
  if (/\brow|menu|action|list/.test(b)) return 'row'
  if (/\bmuted|faint|subtle/.test(b)) return 'muted'
  return 'default'
}

let filesChanged = 0
let iconsReplaced = 0
const skipped = []

for (const file of walk(SRC)) {
  const rel = relative(ROOT, file).replace(/\\/g, '/')
  if (/\/PortalIcon\.tsx$|\/MockIcon\.tsx$|\/mock-icons\.ts$|\/portal2\/mock-icons/.test(rel)) continue

  let src = readFileSync(file, 'utf8')
  if (!/from\s+['"]lucide-react['"]/.test(src)) continue

  const importRe = /import\s*(?:type\s+)?\{([^}]+)\}\s*from\s*['"]lucide-react['"]\s*;?/g
  const imported = new Map()
  let typeOnlyNames = new Set()
  let m
  while ((m = importRe.exec(src))) {
    const isTypeImport = /import\s+type\s+\{/.test(m[0])
    for (const part of m[1].split(',')) {
      const bit = part.trim()
      if (!bit) continue
      const typed = isTypeImport || bit.startsWith('type ')
      const clean = bit.replace(/^type\s+/, '')
      const [left, right] = clean.split(/\s+as\s+/)
      const orig = left.trim()
      const local = (right || left).trim()
      if (orig === 'LucideIcon' || local === 'LucideIcon') {
        typeOnlyNames.add(local)
        continue
      }
      if (typed) {
        typeOnlyNames.add(local)
        continue
      }
      const n = LUCIDE_TO_N[orig]
      if (!n) {
        skipped.push(`${rel}: unmapped ${orig}`)
        continue
      }
      imported.set(local, n)
    }
  }

  // type LucideIcon only — leave for manual (props typing)
  if (imported.size === 0) {
    if (typeOnlyNames.size > 0 && !/[^a-zA-Z]LucideIcon[^a-zA-Z]/.test(src.replace(/import\s*(?:type\s+)?\{[^}]*\}\s*from\s*['"]lucide-react['"]\s*;?/g, ''))) {
      // unused type import
      src = src.replace(importRe, '')
      filesChanged++
      if (!DRY) writeFileSync(file, src)
      console.log(`${DRY ? '[dry] ' : ''}${rel} (type-only removed)`)
    } else {
      skipped.push(`${rel}: type-only LucideIcon kept`)
    }
    continue
  }

  for (const [local, n] of imported) {
    const tagRe = new RegExp(`<${local}(\\s[^>/]*)?\\s*/>`, 'g')
    src = src.replace(tagRe, (full, attrs = '') => {
      iconsReplaced++
      let a = attrs || ''
      let size = ''
      let className = ''
      const sizeM = a.match(/\bsize=\{(\d+)\}/)
      if (sizeM) {
        size = ` size={${sizeM[1]}}`
        a = a.replace(sizeM[0], '')
      }
      const cnM = a.match(/\bclassName=(?:\{`[^`]*`\}|\{"[^"]*"\}|\{'[^']*'\}|"[^"]*"|'[^']*'|\{[^}]*\})/)
      if (cnM) {
        className = ` ${cnM[0]}`
        a = a.replace(cnM[0], '')
      }
      a = a
        .replace(/\bstrokeWidth=\{[^}]+\}/g, '')
        .replace(/\babsoluteStrokeWidth(?:=\{[^}]*\})?/g, '')
        .replace(/\bcolor=["'][^"']*["']/g, '')
        .replace(/\s+/g, ' ')
        .trim()
      const ctx = inferCtx(full + (attrs || ''))
      const extra = a ? ` ${a}` : ''
      return `<PortalIcon n="${n}" ctx="${ctx}"${size}${className}${extra} />`
    })
  }

  src = src.replace(/import\s*(?:type\s+)?\{[^}]*\}\s*from\s*['"]lucide-react['"]\s*;?\n?/g, (imp) => {
    // keep if still references LucideIcon as value/type used elsewhere
    if (/LucideIcon/.test(imp) && /\bLucideIcon\b/.test(src.replace(imp, ''))) {
      return `import type { LucideIcon } from "lucide-react";\n`
    }
    return ''
  })

  if (!/from\s+['"]@\/components\/portal\/PortalIcon['"]/.test(src)) {
    const clientM = src.match(/^['"]use client['"];?\s*\n/)
    const insertAt = clientM ? clientM[0].length : 0
    src =
      src.slice(0, insertAt) +
      `import { PortalIcon } from "@/components/portal/PortalIcon";\n` +
      src.slice(insertAt)
  }

  for (const local of imported.keys()) {
    if (new RegExp(`\\b${local}\\b`).test(src)) {
      skipped.push(`${rel}: leftover ${local}`)
    }
  }

  filesChanged++
  if (!DRY) writeFileSync(file, src)
  console.log(`${DRY ? '[dry] ' : ''}${rel}`)
}

console.log(`files=${filesChanged} icons≈${iconsReplaced}${DRY ? ' (dry)' : ''}`)
if (skipped.length) {
  console.log('skipped/leftover:')
  for (const s of skipped.slice(0, 60)) console.log(' ', s)
  if (skipped.length > 60) console.log(`  … +${skipped.length - 60}`)
}
