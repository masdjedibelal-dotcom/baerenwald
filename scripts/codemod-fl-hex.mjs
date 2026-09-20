#!/usr/bin/env node
/**
 * Website: Roh-Hex in CSS → var(--fl-*) (außer Token-Definitionszeilen und #fff/#000).
 * Usage: node scripts/codemod-fl-hex.mjs [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const DRY = process.argv.includes('--dry')

const FILES = [
  'src/app/baerenwald-landing.css',
  'src/components/gpt/gpt-viz.css',
  'src/components/gpt/guided-chat.css',
  'src/components/products/conversion-widget.css',
]

/** longest hex first */
const MAP = [
  ['#ffffff', 'var(--fl-panel)'],
  ['#FFFFFF', 'var(--fl-panel)'],
  ['#2e7d52', 'var(--fl-accent)'],
  ['#2E7D52', 'var(--fl-accent)'],
  ['#1a3d2b', 'var(--fl-accent-dark)'],
  ['#1A3D2B', 'var(--fl-accent-dark)'],
  ['#eaf3de', 'var(--fl-accent-light)'],
  ['#EAF3DE', 'var(--fl-accent-light)'],
  ['#256642', 'var(--fl-accent-hover)'],
  ['#256b45', 'var(--fl-accent-mid)'],
  ['#1f5c3c', 'var(--fl-accent-deep)'],
  ['#3a9462', 'var(--fl-accent-bright)'],
  ['#3d9a62', 'var(--fl-accent-soft)'],
  ['#15803d', 'var(--fl-accent-700)'],
  ['#166534', 'var(--fl-accent-800)'],
  ['#267347', 'var(--fl-accent-hover)'],
  ['#5a9e6f', 'var(--fl-accent-bright)'],
  ['#a8c5a0', 'var(--fl-wave-on-dark)'],
  ['#c8ebd4', 'var(--fl-mint)'],
  ['#f7f6f3', 'var(--fl-bg-warm)'],
  ['#f3f1eb', 'var(--fl-bg-warm-2)'],
  ['#f5faf7', 'var(--fl-bg-green-tint)'],
  ['#f5f8f4', 'var(--fl-bg-green-tint-2)'],
  ['#e8f5ec', 'var(--fl-bg-green-tint-3)'],
  ['#fafcfa', 'var(--fl-bg-green-tint-4)'],
  ['#f6faf7', 'var(--fl-bg-green-tint-5)'],
  ['#f4f6f5', 'var(--fl-bg-neutral)'],
  ['#faf8f5', 'var(--fl-bg-cream)'],
  ['#f4f4f3', 'var(--fl-bg)'],
  ['#f5f6f4', 'var(--fl-bg)'],
  ['#1e1c1a', 'var(--fl-ink-alt)'],
  ['#16201b', 'var(--fl-ink-deep)'],
  ['#16201B', 'var(--fl-ink-deep)'],
  ['#142019', 'var(--fl-ink)'],
  ['#1a2420', 'var(--fl-ink-dark)'],
  ['#524e4a', 'var(--fl-muted)'],
  ['#7a746c', 'var(--fl-text-3)'],
  ['#6b7280', 'var(--fl-gray-500)'],
  ['#9ca3af', 'var(--fl-gray-400)'],
  ['#e5e7eb', 'var(--fl-gray-200)'],
  ['#9e9890', 'var(--fl-gray-stone)'],
  ['#5c6b62', 'var(--fl-faint-3)'],
  ['#3d5247', 'var(--fl-faint-4)'],
  ['#5c6f64', 'var(--fl-faint-5)'],
  ['#8a938e', 'var(--fl-faint)'],
  ['#9aa39e', 'var(--fl-faint2)'],
  ['#c0392b', 'var(--fl-danger-strong)'],
  ['#9c2b2b', 'var(--fl-danger-deep)'],
  ['#c53030', 'var(--fl-danger-c530)'],
  ['#a1242a', 'var(--fl-danger)'],
  ['#b42318', 'var(--fl-danger-deep)'],
  ['#fff5f5', 'var(--fl-danger-tint)'],
  ['#fff7f7', 'var(--fl-danger-tint-alt)'],
  ['#fdecea', 'var(--fl-danger-soft)'],
  ['#f2cfcf', 'var(--fl-danger-line)'],
  ['#f59e0b', 'var(--fl-amber)'],
  ['#b8862a', 'var(--fl-sand-gold)'],
  ['#e8e6e0', 'var(--fl-sand)'],
  ['#fff', 'var(--fl-panel)'],
  ['#FFF', 'var(--fl-panel)'],
]

let total = 0
for (const rel of FILES) {
  const p = join(ROOT, rel)
  let src = readFileSync(p, 'utf8')
  const orig = src
  const lines = src.split('\n')
  const out = lines.map((line) => {
    if (/^\s*--[\w-]+:/.test(line)) return line
    let l = line
    for (const [hex, tok] of MAP) {
      if (l.includes(hex)) {
        const n = (l.split(hex).length - 1)
        total += n
        l = l.split(hex).join(tok)
      }
    }
    return l
  })
  src = out.join('\n')
  if (src !== orig) {
    if (!DRY) writeFileSync(p, src)
    console.log(`${DRY ? '[dry] ' : ''}${rel}`)
  }
}
console.log(`replacements≈${total}${DRY ? ' (dry)' : ''}`)
