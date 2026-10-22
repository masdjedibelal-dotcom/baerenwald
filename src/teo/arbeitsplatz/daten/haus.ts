import 'server-only'

import { logDbError } from '@/lib/errors/log-db-error'
import { supabaseAdmin } from '@/lib/supabase'
import { heute } from '@/teo/arbeitsplatz/plaene/plan-logik'

export type ApMitteilung = { id: string; objektId: string; titel: string; text: string; gueltigBis: string | null; erstellt: string; von: string | null }
export type ApDokument = { id: string; objektId: string; name: string; url: string; datum: string; fuerBewohner: boolean }

/** Mitteilungen ans Haus. `nurAktuell`: abgelaufene ausblenden (Bewohner-Sicht). */
export async function ladeMitteilungen(objektIds: string[], opts: { nurAktuell?: boolean } = {}): Promise<ApMitteilung[]> {
  if (!objektIds.length) return []
  let q = supabaseAdmin
    .from('teo_mitteilungen')
    .select('id, kunde_objekt_id, titel, text, gueltig_bis, created_at, erstellt_name')
    .in('kunde_objekt_id', objektIds)
    .eq('aktiv', true)
    .order('created_at', { ascending: false })
    .limit(50)
  if (opts.nurAktuell) q = q.or(`gueltig_bis.is.null,gueltig_bis.gte.${heute()}`)
  const { data, error } = await q
  if (error) logDbError('teo/arbeitsplatz/daten/haus:mitteilungen', error)
  return (data ?? []).map((m) => ({
    id: String(m.id),
    objektId: String(m.kunde_objekt_id),
    titel: String(m.titel),
    text: String(m.text ?? ''),
    gueltigBis: (m.gueltig_bis as string | null) ?? null,
    erstellt: String(m.created_at),
    von: (m.erstellt_name as string | null) ?? null,
  }))
}

/** Objekt-Dokumente (Teil der Kundenakte der Verwaltung). */
export async function ladeObjektDokumente(orgId: string, objektIds: string[], opts: { nurBewohner?: boolean } = {}): Promise<ApDokument[]> {
  if (!objektIds.length) return []
  let q = supabaseAdmin
    .from('kunden_dokumente')
    .select('id, kunde_objekt_id, name, datei_url, created_at, fuer_bewohner')
    .eq('kunde_id', orgId)
    .in('kunde_objekt_id', objektIds)
    .order('created_at', { ascending: false })
    .limit(200)
  if (opts.nurBewohner) q = q.eq('fuer_bewohner', true)
  const { data, error } = await q
  if (error) logDbError('teo/arbeitsplatz/daten/haus:dokumente', error)
  return (data ?? [])
    .filter((d) => d.datei_url)
    .map((d) => ({
      id: String(d.id),
      objektId: String(d.kunde_objekt_id),
      name: String(d.name),
      url: String(d.datei_url),
      datum: String(d.created_at),
      fuerBewohner: Boolean(d.fuer_bewohner),
    }))
}
