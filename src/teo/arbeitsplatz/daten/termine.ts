import 'server-only'

import { logDbError } from '@/lib/errors/log-db-error'
import { supabaseAdmin } from '@/lib/supabase'

export type ApTerminZeile = { id: string; leadId: string; von: string; titel: string }

/** Handwerker-Termine der nächsten Tage für die gegebenen Vorgänge (Einsätze mit Termin). */
export async function ladeTermine(leadIds: string[], tage = 7): Promise<ApTerminZeile[]> {
  if (!leadIds.length) return []
  const { data: auf, error } = await supabaseAdmin.from('auftraege').select('id, lead_id').in('lead_id', leadIds)
  if (error) logDbError('teo/arbeitsplatz/daten/termine:auftraege', error)
  const leadVonAuftrag = new Map((auf ?? []).map((a) => [String(a.id), String(a.lead_id)]))
  if (!leadVonAuftrag.size) return []
  const jetzt = new Date()
  const bis = new Date(jetzt.getTime() + tage * 86400000)
  const { data, error: eErr } = await supabaseAdmin
    .from('einsaetze')
    .select('id, auftrag_id, titel, termin_von, status')
    .in('auftrag_id', [...leadVonAuftrag.keys()])
    .gte('termin_von', jetzt.toISOString().slice(0, 10))
    .lte('termin_von', bis.toISOString())
    .neq('status', 'abgelehnt')
    .order('termin_von', { ascending: true })
  if (eErr) logDbError('teo/arbeitsplatz/daten/termine:einsaetze', eErr)
  return (data ?? []).map((e) => ({
    id: String(e.id),
    leadId: leadVonAuftrag.get(String(e.auftrag_id)) ?? '',
    von: String(e.termin_von),
    titel: String(e.titel ?? 'Termin'),
  }))
}
