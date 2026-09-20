/**
 * Portal: Lead-/HV-Status-Writes (P2-5).
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export const HV_MELDUNG_WRITE_STATUSES = [
  'neu',
  'hm_pruefung',
  'hm_erledigt',
  'in_bearbeitung',
  'freigegeben',
  'abgelehnt',
  'notmassnahme',
] as const

export const ORG_FREIGABE_WRITE_STATUSES = [
  'nicht_noetig',
  'ausstehend',
  'beschluss_ausstehend',
  'freigegeben',
  'abgelehnt',
] as const

function assertKnown(domain: string, status: string, allowed: readonly string[]) {
  const key = status.trim().toLowerCase()
  if (!allowed.includes(key)) throw new Error(`${domain}: unbekannter Status „${status}“`)
  return key
}

export function planHvMeldungStatusWrite(
  status: string,
  extra: Record<string, unknown> = {},
  now = new Date()
) {
  const key = assertKnown('hv_meldung', status, HV_MELDUNG_WRITE_STATUSES)
  return { hv_meldung_status: key, updated_at: now.toISOString(), ...extra }
}

export function planOrgFreigabeWrite(
  status: string,
  extra: Record<string, unknown> = {},
  now = new Date()
) {
  const key = assertKnown('org_freigabe', status, ORG_FREIGABE_WRITE_STATUSES)
  return { org_freigabe_status: key, updated_at: now.toISOString(), ...extra }
}

export async function writeLeadHvMeldungStatus(
  supabase: SupabaseClient,
  leadId: string,
  status: string,
  extra: Record<string, unknown> = {}
) {
  const patch = planHvMeldungStatusWrite(status, extra)
  return supabase.from('leads').update(patch).eq('id', leadId)
}

export async function writeLeadOrgFreigabe(
  supabase: SupabaseClient,
  leadId: string,
  status: string,
  extra: Record<string, unknown> = {}
) {
  const patch = planOrgFreigabeWrite(status, extra)
  return supabase.from('leads').update(patch).eq('id', leadId)
}
