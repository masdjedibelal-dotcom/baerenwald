#!/usr/bin/env node
/**
 * P2-4 Portal-Guard: synchronisierte Dateien dürfen nur über
 * CRM `npm run sync:shared-domain` geändert werden (byte-gleich zu transformierter CRM-Quelle).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const PORTAL_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const CRM_ROOT =
  process.env.CRM_ROOT || path.join(PORTAL_ROOT, '..', 'baerenwald-system')
const MANIFEST = path.join(CRM_ROOT, 'scripts/shared-domain-files.json')

/** Muss mit CRM scripts/sync-shared-domain.mjs rewriteImportsForPortal identisch bleiben. */
function rewriteImportsForPortal(src) {
  let s = src
  s = s.replaceAll(
    '@/lib/anfragen/anfrage-akut-schwelle',
    '@/lib/crm-vorgang/anfrage-akut-schwelle'
  )
  s = s.replaceAll('@/lib/org/hv-lead-helpers', '@/lib/crm-vorgang/hv-lead-helpers')
  s = s.replaceAll('@/lib/vorgang/', '@/lib/crm-vorgang/')
  s = s.replaceAll('@/lib/status/status-map', '@/lib/shared-domain/status-map')
  s = s.replaceAll('@/lib/format/geld-datum', '@/lib/shared-domain/geld-datum')
  s = s.replaceAll('@/lib/status/status-vokabular', '@/lib/shared-domain/status-vokabular')
  s = s.replaceAll('@/lib/pdf/chrome', '@/lib/shared-domain/pdf-chrome')
  s = s.replaceAll('@/lib/tokens/colors', '@/lib/shared-domain/colors')
  s = s.replaceAll(
    '@/lib/templates/angebot-mail',
    '@/lib/portal/portal-display'
  )
  s = s.replaceAll(
    "from '@/lib/types'",
    "from '@/lib/crm-vorgang/crm-types-bridge'"
  )
  s = s.replaceAll(
    'from "@/lib/types"',
    'from "@/lib/crm-vorgang/crm-types-bridge"'
  )
  return s
}

function expectedPortalContent(crmRel, header, rewrite) {
  const src = fs.readFileSync(path.join(CRM_ROOT, crmRel), 'utf8')
  const body = src.replace(/^\/\/ SYNCED FROM CRM — do not edit\n/, '')
  const transformed = rewrite ? rewriteImportsForPortal(body) : body
  return header + transformed
}

function main() {
  if (!fs.existsSync(MANIFEST)) {
    // Netlify/CI: nur Portal-Repo ausgecheckt — Sync-Guard braucht Sibling CRM.
    // Lokal / mit CRM_ROOT weiter strikt prüfen.
    const netlifyOrCi = Boolean(process.env.NETLIFY || process.env.CI)
    console.warn(`[check-shared-domain-sync] CRM-Manifest fehlt: ${MANIFEST}`)
    console.warn(
      netlifyOrCi
        ? '[check-shared-domain-sync] Netlify/CI ohne CRM_ROOT — Guard übersprungen (Build bricht nicht).'
        : '[check-shared-domain-sync] Setze CRM_ROOT oder lege baerenwald-system neben baerenwald. Lokal: Guard übersprungen.'
    )
    process.exit(0)
  }

  const raw = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
  const header = raw.header || '// SYNCED FROM CRM — do not edit\n'
  const files = raw.files || []
  let drift = 0

  for (const entry of files) {
    const crmPath = path.join(CRM_ROOT, entry.crm)
    const portalPath = path.join(PORTAL_ROOT, entry.portal)
    if (!fs.existsSync(crmPath)) {
      console.error(`CRM-Quelle fehlt: ${entry.crm}`)
      drift++
      continue
    }
    const expected = expectedPortalContent(entry.crm, header, Boolean(entry.rewrite))
    const actual = fs.existsSync(portalPath) ? fs.readFileSync(portalPath, 'utf8') : null
    if (actual !== expected) {
      drift++
      console.error(`DRIFT ${entry.portal} — bitte im CRM: npm run sync:shared-domain`)
    } else {
      console.log(`OK   ${entry.portal}`)
    }
  }

  if (drift) {
    console.error(`\n${drift} Sync-Datei(en) weichen ab (nur via Sync-Skript ändern)`)
    process.exit(1)
  }
  console.log(`OK: Shared-Domain Sync-Guard (${files.length} Dateien)`)
}

main()
