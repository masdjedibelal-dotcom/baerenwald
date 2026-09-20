/**
 * Portal: Auftrag- / Partner-Status-Writes (P2-5).
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export const AUFTRAG_WRITE_STATUSES = [
  'offen',
  'in_arbeit',
  'abnahme',
  'abgeschlossen',
  'storniert',
] as const

export const PARTNER_HW_WRITE_STATUSES = [
  'ausstehend',
  'angefragt',
  'warten',
  'akzeptiert',
  'angenommen',
  'abgelehnt',
  'zugewiesen',
  'ersetzt',
  'erledigt',
] as const

export function planAuftragStatusWrite(
  status: string,
  extra: Record<string, unknown> = {},
  now = new Date()
) {
  const key = status.trim().toLowerCase()
  if (!(AUFTRAG_WRITE_STATUSES as readonly string[]).includes(key)) {
    throw new Error(`auftrag: unbekannter Status „${status}“`)
  }
  return { status: key, updated_at: now.toISOString(), ...extra }
}

export function planAbnahmeWrite(extra: Record<string, unknown> = {}, now = new Date()) {
  return planAuftragStatusWrite('abnahme', extra, now)
}

export function planPartnerHwStatusWrite(
  status: string,
  extra: Record<string, unknown> = {},
  now = new Date()
) {
  const key = status.trim().toLowerCase()
  if (!(PARTNER_HW_WRITE_STATUSES as readonly string[]).includes(key)) {
    throw new Error(`partner_hw: unbekannter Status „${status}“`)
  }
  return { handwerker_status: key, updated_at: now.toISOString(), ...extra }
}

export async function writeAuftragStatus(
  supabase: SupabaseClient,
  auftragId: string,
  status: string,
  extra: Record<string, unknown> = {}
) {
  const patch = planAuftragStatusWrite(status, extra)
  return supabase.from('auftraege').update(patch).eq('id', auftragId)
}
