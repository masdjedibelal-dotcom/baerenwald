import 'server-only'

import { logDbError } from '@/lib/errors/log-db-error'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * Eigene TEO-Adresse einer Verwaltung für Schäden/Aufträge per E-Mail.
 * Gleiche Regel wie im CRM (teo/hv/auftrag-per-mail): auftrag+<kennung>@<Eingangsdomain>.
 * null, wenn der Mail-Eingang (AUFTRAG_EINGANG_EMAIL) nicht eingerichtet ist oder die Verwaltung keine Kennung hat.
 */
export async function ladeSchadenAdresse(orgId: string): Promise<string | null> {
  const m = process.env.AUFTRAG_EINGANG_EMAIL?.trim().toLowerCase().match(/^([a-z0-9._-]+)@([a-z0-9.-]+\.[a-z]{2,})$/)
  if (!m) return null
  const { data, error } = await supabaseAdmin.from('kunden').select('org_kennung').eq('id', orgId).maybeSingle()
  if (error) logDbError('teo/arbeitsplatz/schaden-adresse', error)
  const k = String(data?.org_kennung ?? '').trim().toLowerCase()
  return k ? `${m[1]}+${k}@${m[2]}` : null
}
