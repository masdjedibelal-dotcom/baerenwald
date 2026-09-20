/**
 * Portal: Rechnung-Status-Writes (P2-5) — falls Portal Rechnungsstatus setzt.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export const RECHNUNG_WRITE_STATUSES = [
  'entwurf',
  'gesendet',
  'bezahlt',
  'storniert',
] as const

export function planRechnungStatusWrite(
  status: string,
  extra: Record<string, unknown> = {},
  now = new Date()
) {
  const key = status.trim().toLowerCase()
  if (!(RECHNUNG_WRITE_STATUSES as readonly string[]).includes(key)) {
    throw new Error(`rechnung: unbekannter Status „${status}“`)
  }
  return { status: key, updated_at: now.toISOString(), ...extra }
}

export function planRechnungBezahltWrite(extra: Record<string, unknown> = {}, now = new Date()) {
  return planRechnungStatusWrite('bezahlt', extra, now)
}

export async function writeRechnungStatus(
  supabase: SupabaseClient,
  rechnungId: string,
  status: string,
  extra: Record<string, unknown> = {}
) {
  const patch = planRechnungStatusWrite(status, extra)
  return supabase.from('rechnungen').update(patch).eq('id', rechnungId)
}
