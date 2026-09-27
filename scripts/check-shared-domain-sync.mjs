#!/usr/bin/env node
/**
 * P2-4 Portal-Guard: synchronisierte Dateien dürfen nur über
 * CRM `npm run sync:shared-domain` geändert werden (byte-gleich zu transformierter CRM-Quelle).
 *
 * Lokal / mit Sibling: Fehlt CRM-Manifest → Abbruch (kein stiller Erfolg).
 * Netlify: nur Portal-Repo ausgecheckt → Skip, wenn CRM_ROOT nicht gesetzt
 * (Explizites CRM_ROOT auf Netlify bleibt hart: falsch konfiguriert → Abbruch).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const PORTAL_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const crmRootFromEnv = process.env.CRM_ROOT?.trim() || ''
const CRM_ROOT =
  crmRootFromEnv || path.join(PORTAL_ROOT, '..', 'baerenwald-system')
const MANIFEST = path.join(CRM_ROOT, 'scripts/shared-domain-files.json')
const onNetlify = process.env.NETLIFY === 'true'
/** GitHub Actions checkt ebenfalls nur das Portal-Repo aus (staging-ci.yml). */
const onGithubActions = process.env.GITHUB_ACTIONS === 'true'
const onRemoteCiWithoutCrmCheckout = onNetlify || onGithubActions

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
    // Netlify / GHA: nur Portal-Repo — Sync-Vergleich ohne CRM unmöglich.
    if (onRemoteCiWithoutCrmCheckout && !crmRootFromEnv) {
      const where = onNetlify ? 'Netlify' : 'GitHub Actions'
      console.log(
        `[check-shared-domain-sync] übersprungen — kein CRM-Sibling in ${where} (CRM_ROOT unset)`
      )
      process.exit(0)
    }
    console.error(`[check-shared-domain-sync] CRM-Manifest fehlt: ${MANIFEST}`)
    console.error(
      'Setze CRM_ROOT oder lege baerenwald-system neben baerenwald. Sync-Guard ohne Gegenstück bricht ab.'
    )
    process.exit(1)
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
