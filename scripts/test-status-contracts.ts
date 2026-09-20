/**
 * P2-6 Portal: Vertrags-Tests Status-Planner (ohne DB).
 */
import {
  planOrgFreigabeWrite,
  planHvMeldungStatusWrite,
} from '../src/lib/status/write-lead-status'
import { planPartnerAnnahmeWrite } from '../src/lib/status/write-angebot-status'
import { planAbnahmeWrite, planPartnerHwStatusWrite } from '../src/lib/status/write-auftrag-status'
import { planRechnungBezahltWrite, planRechnungStatusWrite } from '../src/lib/status/write-rechnung-status'

const fixedNow = new Date('2026-06-15T12:00:00.000Z')

function assertEq(label: string, actual: unknown, expected: unknown) {
  if (actual !== expected) {
    throw new Error(`${label}: erwartet ${JSON.stringify(expected)}, erhalten ${JSON.stringify(actual)}`)
  }
}

function main() {
  assertEq('hv', planOrgFreigabeWrite('freigegeben', {}, fixedNow).org_freigabe_status, 'freigegeben')
  assertEq('hm', planHvMeldungStatusWrite('hm_erledigt', {}, fixedNow).hv_meldung_status, 'hm_erledigt')
  assertEq('partner', planPartnerAnnahmeWrite('angenommen', {}, fixedNow).status, 'angenommen')
  assertEq('partner.hw', planPartnerHwStatusWrite('akzeptiert', {}, fixedNow).handwerker_status, 'akzeptiert')
  assertEq('abnahme', planAbnahmeWrite({}, fixedNow).status, 'abnahme')
  assertEq('re.bezahlt', planRechnungBezahltWrite({}, fixedNow).status, 'bezahlt')
  assertEq('re.storno', planRechnungStatusWrite('storniert', {}, fixedNow).status, 'storniert')
  console.log('OK: Portal Status-Vertrags-Tests (HV/Partner/Abnahme/RE/Storno)')
}

main()
