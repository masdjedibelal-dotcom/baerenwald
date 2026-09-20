/**
 * Portal: Angebot-Status-Writes (P2-5).
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export const ANGEBOT_WRITE_STATUSES = [
  'entwurf',
  'gesendet_handwerker',
  'handwerker_akzeptiert',
  'gesendet_kunde',
  'gesendet',
  'angenommen',
  'kunde_akzeptiert',
  'abgelehnt',
  'abgelaufen',
  'ersetzt',
  'storniert',
] as const

export function planAngebotStatusWrite(
  status: string,
  extra: Record<string, unknown> = {},
  now = new Date()
) {
  const key = status.trim().toLowerCase()
  if (!(ANGEBOT_WRITE_STATUSES as readonly string[]).includes(key)) {
    throw new Error(`angebot: unbekannter Status „${status}“`)
  }
  return { status: key, updated_at: now.toISOString(), ...extra }
}

export function planPartnerAnnahmeWrite(
  variant: 'handwerker_akzeptiert' | 'angenommen' = 'handwerker_akzeptiert',
  extra: Record<string, unknown> = {},
  now = new Date()
) {
  return planAngebotStatusWrite(variant, extra, now)
}

export async function writeAngebotStatus(
  supabase: SupabaseClient,
  angebotId: string,
  status: string,
  extra: Record<string, unknown> = {}
) {
  const patch = planAngebotStatusWrite(status, extra)
  return supabase.from('angebote').update(patch).eq('id', angebotId)
}
