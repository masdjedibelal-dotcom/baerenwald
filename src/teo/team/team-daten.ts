import 'server-only'

import { logDbError } from '@/lib/errors/log-db-error'
import { supabaseAdmin } from '@/lib/supabase'
import { ladePlaene, type ApPlan } from '@/teo/arbeitsplatz/daten/plaene'
import type { ApKontext } from '@/teo/arbeitsplatz/kontext'
import { teamAuftragAus } from '@/teo/hv/vorgang-aktionen'

/** Pläne dieser Person: ihr zugewiesen oder dem ganzen Team. */
export async function ladeMeinePlaene(k: ApKontext): Promise<ApPlan[]> {
  const alle = await ladePlaene(k)
  return alle.filter((p) => p.zustaendig === 'team' && (!p.zustaendigId || p.zustaendigId === k.person.mitgliedId))
}

export type TeamVorgang = {
  id: string
  titel: string
  beschreibung: string
  objektName: string | null
  einheit: string | null
  melder: string | null
  telefon: string | null
  fotos: string[]
  seit: string
}

/** Offene Vorgänge, die die Verwaltung dieser Person gegeben hat. */
export async function ladeMeineVorgaenge(k: ApKontext): Promise<TeamVorgang[]> {
  if (!k.person.mitgliedId) return []
  const { data, error } = await supabaseAdmin
    .from('leads')
    .select('id, kontakt_nachricht, funnel_daten, melder_einheit, melder_name, melder_telefon, kunde_objekt_id')
    .eq('auftraggeber_kunde_id', k.org.id)
    .eq('hv_meldung_status', 'neu')
    .is('geloescht_am', null)
    .contains('funnel_daten', { team: { mitglied_id: k.person.mitgliedId } })
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) logDbError('teo/team/team-daten:vorgaenge', error)
  const zeilen = (data ?? []).filter((l) => {
    const t = teamAuftragAus(l.funnel_daten)
    return t && !t.ergebnis
  })
  if (!zeilen.length) return []

  const { data: obj, error: oErr } = await supabaseAdmin.from('kunden_objekte').select('id, titel, strasse, hausnummer').eq('kunde_id', k.org.id)
  if (oErr) logDbError('teo/team/team-daten:objekte', oErr)
  const objektName = new Map((obj ?? []).map((o) => [String(o.id), o.titel?.trim() || [o.strasse, o.hausnummer].filter(Boolean).join(' ') || 'Objekt']))

  return zeilen.map((l) => {
    const fd = (l.funnel_daten ?? {}) as { beschreibung?: unknown; fotos?: unknown }
    const text = String(fd.beschreibung ?? l.kontakt_nachricht ?? '').trim()
    const satz = text.split(/(?<=[.!?])\s|\n/)[0] ?? text
    return {
      id: String(l.id),
      titel: (satz.length > 70 ? `${satz.slice(0, 67)}…` : satz) || 'Vorgang',
      beschreibung: text,
      objektName: l.kunde_objekt_id ? objektName.get(String(l.kunde_objekt_id)) ?? null : null,
      einheit: l.melder_einheit?.trim() || null,
      melder: l.melder_name?.trim() || null,
      telefon: l.melder_telefon?.trim() || null,
      fotos: Array.isArray(fd.fotos) ? (fd.fotos as unknown[]).filter((u): u is string => typeof u === 'string' && /^https?:\/\//.test(u)) : [],
      seit: String(teamAuftragAus(l.funnel_daten)?.am ?? ''),
    }
  })
}
