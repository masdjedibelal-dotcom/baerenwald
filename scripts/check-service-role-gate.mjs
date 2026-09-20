#!/usr/bin/env node
/**
 * P1-6 Portal: Service-Role ohne Session/Secret-Gate → Build bricht.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = path.join(root, 'src')

const SERVICE_ROLE_IMPORT =
  /from\s+['"]@\/lib\/supabase['"]|supabaseAdmin\b|SUPABASE_SERVICE_ROLE_KEY|getServiceRole/

const GATE =
  /requireOrganisationSession|requireOrgAdminSession|requireOrgFreigabeSession|requireOrgWrite|requireAccountSession|requireEigentuemer|assertOrg|assertPartner|assertPortal|CRON_SECRET|INTERNAL_API_SECRET|PARTNER_INTERNAL_API_SECRET|GPT_VIZ_INTERNAL_API_SECRET|LEAD_API_SECRET|auth\.getUser\s*\(|\.auth\.getUser\s*\(|createServerClient|verifyToken|token_hash|getGptVizPortalKundeId|getGptVizSession|checkRateLimit/

const ALLOWLIST = new Set([
  'src/lib/supabase.ts',
  'src/app/api/dev/auto-login/route.ts',
  'src/app/api/ki-rechner/route.ts',
  'src/app/api/melden/feedback/route.ts',
  'src/app/api/melden/status/route.ts',
  'src/app/api/melden/terminslots/route.ts',
  'src/app/api/meldung/ergaenzen/route.ts',
  'src/app/api/meldung/route.ts',
  'src/app/api/meldung/upload/route.ts',
  'src/app/api/org/kalender/ics/route.ts',
  'src/app/api/gpt-viz/session/route.ts',
  'src/app/api/gpt-viz/upload/route.ts',
  'src/app/actions/partner-rahmenvertrag-preview.ts',
  // Libs: Gate beim Aufrufer (Route/Action)
  'src/lib/vorgang/sync-lead-from-crm.ts',
  'src/lib/push/send-web-push.ts',
  'src/lib/push/resolve-recipients.ts',
  'src/lib/portal2/portal-einladungen-server.ts',
])

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === '.next') continue
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, acc)
    else if (/\.(ts|tsx)$/.test(ent.name)) acc.push(p)
  }
  return acc
}

function isAppEntry(rel, text) {
  if (rel.includes('/api/') && /\/route\.tsx?$/.test(rel)) return true
  if (/"use server"/.test(text) || /'use server'/.test(text)) return true
  return false
}

const offenders = []
for (const abs of walk(srcDir)) {
  const rel = path.relative(root, abs).split(path.sep).join('/')
  const text = fs.readFileSync(abs, 'utf8')
  if (!SERVICE_ROLE_IMPORT.test(text)) continue
  if (!isAppEntry(rel, text)) continue
  if (ALLOWLIST.has(rel)) continue
  if (rel.includes('/[token]/')) continue
  if (!GATE.test(text)) offenders.push(rel)
}

if (offenders.length) {
  console.error('[check-service-role-gate] P1-6 FEHLER:')
  for (const o of offenders.sort()) console.error('  -', o)
  process.exit(1)
}
console.log('[check-service-role-gate] OK')
process.exit(0)
