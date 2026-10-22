import 'server-only'

import { logDbError } from '@/lib/errors/log-db-error'
import { supabaseAdmin } from '@/lib/supabase'
import { ANLAGE_ARTEN, type AnlageArt, type ApAnlage } from '@/teo/arbeitsplatz/anlagen'
import type { ApKontext } from '@/teo/arbeitsplatz/kontext'

/** Ohne `objektId`: alle Anlagen der Organisation (Auswahl im Plan). */
export async function ladeAnlagen(k: ApKontext, objektId?: string): Promise<ApAnlage[]> {
  let q = supabaseAdmin.from('teo_anlagen').select('id, kunde_objekt_id, name, art, baujahr, notiz').eq('kunde_id', k.org.id).eq('aktiv', true).order('name')
  if (objektId) q = q.eq('kunde_objekt_id', objektId)
  const { data, error } = await q
  if (error) logDbError('teo/arbeitsplatz/daten/anlagen', error)
  return (data ?? []).map((a) => ({
    id: String(a.id),
    objektId: String(a.kunde_objekt_id),
    name: String(a.name),
    art: (ANLAGE_ARTEN as readonly string[]).includes(String(a.art)) ? (a.art as AnlageArt) : 'sonstiges',
    baujahr: a.baujahr == null ? null : Number(a.baujahr),
    notiz: (a.notiz as string | null) ?? null,
  }))
}
