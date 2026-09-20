#!/usr/bin/env node
/** P6-4: portal-btn auf <button> nur in PortalButton — sonst Fehler. */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = join(process.cwd(), 'src')
const allow = [/PortalButton\.tsx$/]

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') || name === 'node_modules') continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.tsx$/.test(name)) out.push(p)
  }
  return out
}

let hits = 0
const files = []
for (const file of walk(root)) {
  const rel = relative(process.cwd(), file).replace(/\\/g, '/')
  if (allow.some((a) => a.test(rel))) continue
  const src = readFileSync(file, 'utf8')
  const re = /<button\b[^>]*portal-btn[^>]*>/g
  let m
  while ((m = re.exec(src))) {
    hits++
    files.push(rel)
  }
}
if (hits) {
  for (const f of files) {
    console.error(`[P6-4] portal-btn auf <button> → PortalButton: ${f}`)
  }
  console.error(`\n[P6-4] ${hits} Verstoß/e — Build abgebrochen.`)
  process.exit(1)
}
console.log('[P6-4] ok — kein portal-btn auf <button> außerhalb PortalButton')
process.exit(0)
