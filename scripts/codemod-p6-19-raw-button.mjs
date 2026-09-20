#!/usr/bin/env node
/**
 * P6-19: <button> → <PortalButton variant="…"> in Portal-Surfaces.
 *
 * Usage:
 *   node scripts/codemod-p6-19-raw-button.mjs
 *   node scripts/codemod-p6-19-raw-button.mjs src/components/partner/Foo.tsx
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import ts from 'typescript'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const SURFACE = ['portal', 'partner', 'org', 'shared', 'melden']
const ALLOW = /PortalButton\.tsx$|PortalFormControls\.tsx$|AuthPrimitives\.tsx$|MieterWlFrame\.tsx$|PortalModalShell\.tsx$|PortalSheetConfirm\.tsx$|PortalSectionAddButton/
const IMPORT = `import { PortalButton } from "@/components/portal/PortalButton";`

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      if (['node_modules', '.next'].includes(ent.name)) continue
      walk(p, acc)
    } else if (/\.tsx$/.test(ent.name)) acc.push(p)
  }
  return acc
}

function relOf(abs) {
  return path.relative(ROOT, abs).replace(/\\/g, '/')
}

function classText(attr, sf) {
  if (!attr?.initializer) return ''
  if (ts.isStringLiteral(attr.initializer) || ts.isNoSubstitutionTemplateLiteral(attr.initializer)) {
    return attr.initializer.text
  }
  return attr.initializer.getText(sf)
}

function inferVariant(classSrc, childrenText) {
  const s = `${classSrc} ${childrenText}`.toLowerCase()
  if (/btn-pill-primary|portal-action-btn--primary|mieter-wl-btn--primary|bg-\[var\(--p2-primary\)\]|bg-accent|bg-\[var\(--org-primary/.test(s)) {
    return 'primary'
  }
  if (/btn-pill-outline|portal-action-btn--secondary|mieter-wl-btn--ghost|portal-action-btn--ghost|--ghost|btn-ghost/.test(s)) {
    // outline pills → secondary; explicit ghost → ghost
    if (/btn-pill-outline|portal-action-btn--secondary/.test(s)) return 'secondary'
    return 'ghost'
  }
  if (/danger|destructive|text-red|text-danger|portal-action-btn--danger/.test(s)) {
    return 'danger'
  }
  if (/löschen|entfernen/.test(s) && /aria-label|title/.test(classSrc + childrenText)) {
    return 'ghost'
  }
  // Default: preserve look via className; semantic ghost keeps chrome light
  return 'ghost'
}

function childrenPlain(el, sf) {
  if (!el.children?.length) return ''
  return el.children.map((c) => c.getText(sf)).join('')
}

function ensureImport(src) {
  if (/from\s+["']@\/components\/portal\/PortalButton["']/.test(src)) return src
  if (/from\s+["'][^"']*PortalButton["']/.test(src)) return src

  // After "use client" / first import block
  const useClient = /^(["']use client["'];\s*\n)/.exec(src)
  let insertAt = 0
  if (useClient) insertAt = useClient[0].length

  const importBlock = src.slice(insertAt).match(/^(?:import[\s\S]*?;\n)+/)
  if (importBlock) {
    const end = insertAt + importBlock[0].length
    return src.slice(0, end) + IMPORT + '\n' + src.slice(end)
  }
  return src.slice(0, insertAt) + IMPORT + '\n' + src.slice(insertAt)
}

function rewriteCopyInChildren(text) {
  // Button label text only (not comments): Schließen → Abbrechen; Entfernen → Löschen
  let t = text
  // JSX text nodes often appear as `\n                  Schließen\n                `
  t = t.replace(/(>\s*)Schließen(\s*<)/g, '$1Abbrechen$2')
  t = t.replace(/(>\s*)Entfernen(\s*<)/g, '$1Löschen$2')
  // aria-label for delete actions
  t = t.replace(/aria-label=["']Entfernen["']/g, 'aria-label="Löschen"')
  t = t.replace(/title=["']Entfernen["']/g, 'title="Löschen"')
  // Keep aria-label="Schließen" on icon-only close (X) — do not change those
  return t
}

function transformFile(abs) {
  const rel = relOf(abs)
  if (ALLOW.test(rel)) return { changed: false, count: 0 }
  let src = fs.readFileSync(abs, 'utf8')
  if (!/<button\b/.test(src)) return { changed: false, count: 0 }

  const sf = ts.createSourceFile(abs, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  /** @type {{ start: number, end: number, replacement: string }[]} */
  const edits = []

  function visit(node) {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(sf) === 'button') {
      const attrs = node.attributes
      const classAttr = attrs.properties.find(
        (p) => ts.isJsxAttribute(p) && p.name?.getText(sf) === 'className'
      )
      const cls = classAttr && ts.isJsxAttribute(classAttr) ? classText(classAttr, sf) : ''
      const variant = inferVariant(cls, '')
      const openStart = node.getStart(sf)
      const openEnd = node.getEnd()
      const full = node.getText(sf)
      // <button ... /> → <PortalButton variant="…" ... />
      const replaced = full.replace(/^<button\b/, `<PortalButton variant="${variant}"`)
      edits.push({ start: openStart, end: openEnd, replacement: replaced })
    } else if (ts.isJsxElement(node) && node.openingElement.tagName.getText(sf) === 'button') {
      const open = node.openingElement
      const close = node.closingElement
      const classAttr = open.attributes.properties.find(
        (p) => ts.isJsxAttribute(p) && p.name?.getText(sf) === 'className'
      )
      const cls = classAttr && ts.isJsxAttribute(classAttr) ? classText(classAttr, sf) : ''
      const kids = childrenPlain(node, sf)
      const variant = inferVariant(cls, kids)

      const openText = open.getText(sf).replace(/^<button\b/, `<PortalButton variant="${variant}"`)
      edits.push({
        start: open.getStart(sf),
        end: open.getEnd(),
        replacement: openText,
      })
      edits.push({
        start: close.getStart(sf),
        end: close.getEnd(),
        replacement: '</PortalButton>',
      })
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)

  if (!edits.length) return { changed: false, count: 0 }

  edits.sort((a, b) => b.start - a.start)
  let out = src
  for (const e of edits) {
    out = out.slice(0, e.start) + e.replacement + out.slice(e.end)
  }
  out = ensureImport(out)
  out = rewriteCopyInChildren(out)

  // Strip redundant pill classes when PortalButton carries variant
  out = out.replace(
    /className="btn-pill-primary(\s+[^"]*)?"/g,
    (_, rest) => (rest?.trim() ? `className="${rest.trim()}"` : '')
  )
  out = out.replace(
    /className="btn-pill-outline(\s+[^"]*)?"/g,
    (_, rest) => (rest?.trim() ? `className="${rest.trim()}"` : '')
  )
  // Clean double spaces / empty className leftovers from attribute removal
  out = out.replace(/\s+className=""/g, '')
  out = out.replace(/<PortalButton variant="primary"\s+>/g, '<PortalButton variant="primary">')
  out = out.replace(/<PortalButton variant="secondary"\s+>/g, '<PortalButton variant="secondary">')

  if (out !== src) {
    fs.writeFileSync(abs, out)
    return { changed: true, count: edits.filter((e) => e.replacement.startsWith('<PortalButton') || e.replacement.startsWith('<button')).length / 1 }
  }
  return { changed: false, count: 0 }
}

function main() {
  const args = process.argv.slice(2)
  let files
  if (args.length) {
    files = args.map((a) => path.resolve(ROOT, a))
  } else {
    files = []
    for (const s of SURFACE) {
      walk(path.join(ROOT, 'src/components', s), files)
    }
  }

  let changedFiles = 0
  let buttons = 0
  for (const f of files) {
    const r = transformFile(f)
    if (r.changed) {
      changedFiles++
      const n = (fs.readFileSync(f, 'utf8').match(/<PortalButton\b/g) || []).length
      buttons += r.count
      console.log(`✓ ${relOf(f)}`)
    }
  }
  console.log(`\nDone: ${changedFiles} files`)
}

main()
