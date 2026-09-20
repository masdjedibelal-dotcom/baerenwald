#!/usr/bin/env node
/** Portal-Wrapper: führt CRM-Repo-Skript aus (gleiche Staging-URLs, Ausgabe dort). */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const crmScript = join(here, '../../baerenwald-system/scripts/mobile-audit-playwright.mjs')
if (!existsSync(crmScript)) {
  console.error('Erwarte baerenwald-system neben baerenwald:', crmScript)
  process.exit(1)
}
const r = spawnSync(process.execPath, [crmScript], { stdio: 'inherit', env: process.env })
process.exit(r.status ?? 1)
