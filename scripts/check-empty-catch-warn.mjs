#!/usr/bin/env node
/** P4-2 Portal: Warn-Guard leere catch. Ausnahmen: Umfeld mit `P4-2-ok`. */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = join(process.cwd(), 'src')
const patterns = [
  { name: 'empty-catch-block', re: /catch\s*\([^)]*\)\s*\{\s*\}/g },
  { name: 'empty-catch-arrow', re: /\.catch\s*\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/g },
]

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, out)
    else if (/\.(ts|tsx|js|jsx)$/.test(name)) out.push(p)
  }
  return out
}

function countHits(src, re) {
  let n = 0
  re.lastIndex = 0
  let m
  while ((m = re.exec(src))) {
    const around = src.slice(Math.max(0, m.index - 40), m.index + m[0].length + 80)
    if (around.includes('P4-2-ok')) continue
    n += 1
  }
  return n
}

let hits = 0
for (const file of walk(root)) {
  const src = readFileSync(file, 'utf8')
  for (const { name, re } of patterns) {
    const n = countHits(src, re)
    if (n) {
      hits += n
      console.warn(`[P4-2 ${name}] ${relative(process.cwd(), file)} ×${n}`)
    }
  }
}
if (hits) console.warn(`\n[P4-2] ${hits} stille catch-Stelle(n) (Warnung).`)
else console.log('[P4-2] ok')
process.exit(0)
