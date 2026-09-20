#!/usr/bin/env node
/**
 * P2-5 Portal: direkte Status-Updates nur in write-*-Helfern (Allowlist = Legacy).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = path.join(root, 'src')
const allowlistPath = path.join(root, 'scripts/status-write-allowlist.txt')

const STATUS_UPDATE_RE =
  /\.update\(\s*\{[\s\S]{0,400}?\b(?:status|status_einfach|hv_meldung_status|org_freigabe_status|handwerker_status)\s*:/g

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === '.next') continue
      walk(p, acc)
    } else if (/\.(tsx?|jsx?)$/.test(ent.name)) acc.push(p)
  }
  return acc
}

function isWriteHelper(rel) {
  return /src\/lib\/status\/write-/.test(rel)
}

function loadAllowlist() {
  if (!fs.existsSync(allowlistPath)) return new Set()
  return new Set(
    fs
      .readFileSync(allowlistPath, 'utf8')
      .split('\n')
      .map((l) => l.replace(/#.*$/, '').trim())
      .filter(Boolean)
  )
}

const allow = loadAllowlist()
const violations = []

for (const file of walk(srcDir)) {
  const rel = path.relative(root, file).replace(/\\/g, '/')
  if (isWriteHelper(rel)) continue
  const content = fs.readFileSync(file, 'utf8')
  STATUS_UPDATE_RE.lastIndex = 0
  let m
  while ((m = STATUS_UPDATE_RE.exec(content))) {
    if (allow.has(rel)) continue
    const line = content.slice(0, m.index).split('\n').length
    violations.push({ rel, line })
  }
}

if (violations.length) {
  console.error('Portal Status-Write-Guard fehlgeschlagen:')
  for (const v of violations) console.error(`  ${v.rel}:${v.line}`)
  process.exit(1)
}

console.log('OK: Portal Status-Writes nur über write-* (bzw. Allowlist)')
