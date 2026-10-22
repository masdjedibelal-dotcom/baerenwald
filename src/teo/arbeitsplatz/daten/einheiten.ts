import 'server-only'

import { logDbError } from '@/lib/errors/log-db-error'
import { supabaseAdmin } from '@/lib/supabase'

export type ApEinheit = { id: string; objektId: string; bezeichnung: string; lage: string | null; notiz: string | null }

/** Einheiten der Objekte (optional gepflegt). */
export async function ladeEinheiten(orgId: string, objektIds: string[]): Promise<ApEinheit[]> {
  if (!objektIds.length) return []
  const { data, error } = await supabaseAdmin
    .from('teo_einheiten')
    .select('id, kunde_objekt_id, bezeichnung, lage, notiz')
    .eq('kunde_id', orgId)
    .in('kunde_objekt_id', objektIds)
    .eq('aktiv', true)
    .order('bezeichnung')
  if (error) logDbError('teo/arbeitsplatz/daten/einheiten', error)
  return (data ?? []).map((e) => ({
    id: String(e.id),
    objektId: String(e.kunde_objekt_id),
    bezeichnung: String(e.bezeichnung),
    lage: (e.lage as string | null) ?? null,
    notiz: (e.notiz as string | null) ?? null,
  }))
}
