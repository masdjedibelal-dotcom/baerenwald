import 'server-only'

import { logDbError } from '@/lib/errors/log-db-error'
import { getPortalVorgangDetail } from '@/lib/portal/get-portal-vorgang-detail'
import type { KundePortalDetailItem } from '@/lib/portal/portal-detail-item'
import { supabaseAdmin } from '@/lib/supabase'
import { ladeVorgaenge, type ApVorgangZeile } from '@/teo/arbeitsplatz/daten/vorgaenge'
import type { ApKontext } from '@/teo/arbeitsplatz/kontext'

export type ApProtokollEintrag = { id: string; wann: string; aktion: string; wer: string; betrag: number | null; notiz: string | null }
export type ApNachricht = { id: string; wann: string; von: string; vonTeo: boolean; text: string }
export type ApTermin = { id: string; von: string; bis: string | null; titel: string }

export type ApVorgangDetail = {
  zeile: ApVorgangZeile
  item: KundePortalDetailItem | null
  protokoll: ApProtokollEintrag[]
  nachrichten: ApNachricht[]
  termine: ApTermin[]
}

/** Namen für user-IDs (Mitglieder der Organisation, sonst Hauptkonto). */
async function namenFuer(k: ApKontext, ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const uuids = ids.filter((i) => /^[0-9a-f-]{36}$/i.test(i))
  if (!uuids.length) return map
  const { data, error } = await supabaseAdmin
    .from('kunden_mitglieder')
    .select('auth_user_id, name, email')
    .eq('kunde_id', k.org.id)
    .in('auth_user_id', uuids)
  if (error) logDbError('teo/arbeitsplatz/daten/vorgang-detail:namen', error)
  for (const m of data ?? []) map.set(String(m.auth_user_id), m.name?.trim() || m.email || 'Verwaltung')
  if (uuids.includes(k.userId) && !map.has(k.userId)) map.set(k.userId, k.person.name)
  return map
}

/** Vorgang mit allem für die Detailseite — null, wenn die Person ihn nicht sehen darf. */
export async function ladeVorgangDetail(k: ApKontext, leadId: string): Promise<ApVorgangDetail | null> {
  const [zeile] = await ladeVorgaenge(k, { nurIds: [leadId] })
  if (!zeile) return null

  const [detail, logRes, kommRes, aufRes] = await Promise.all([
    getPortalVorgangDetail({ sessionKundeId: k.org.id, vorgangId: leadId, hvPortalMode: true }),
    supabaseAdmin
      .from('org_freigabe_log')
      .select('id, aktion, betrag_eur, notiz, erstellt_von, created_at')
      .eq('lead_id', leadId)
      .eq('auftraggeber_kunde_id', k.org.id)
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('vorgang_kommentare')
      .select('id, actor_rolle, actor_name, text, created_at')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: true }),
    supabaseAdmin.from('auftraege').select('id').eq('lead_id', leadId),
  ])
  if (logRes.error) logDbError('teo/arbeitsplatz/daten/vorgang-detail:log', logRes.error)
  if (kommRes.error) logDbError('teo/arbeitsplatz/daten/vorgang-detail:kommentare', kommRes.error)
  if (aufRes.error) logDbError('teo/arbeitsplatz/daten/vorgang-detail:auftraege', aufRes.error)

  const auftragIds = (aufRes.data ?? []).map((a) => String(a.id))
  const einsRes = auftragIds.length
    ? await supabaseAdmin
        .from('einsaetze')
        .select('id, titel, termin_von, termin_bis, status')
        .in('auftrag_id', auftragIds)
        .not('termin_von', 'is', null)
        .neq('status', 'abgelehnt')
        .order('termin_von', { ascending: true })
    : { data: [], error: null }
  if (einsRes.error) logDbError('teo/arbeitsplatz/daten/vorgang-detail:einsaetze', einsRes.error)

  const log = logRes.data ?? []
  const namen = await namenFuer(k, log.map((l) => String(l.erstellt_von ?? '')))

  return {
    zeile,
    item: detail?.item ?? null,
    protokoll: log.map((l) => ({
      id: String(l.id),
      wann: String(l.created_at),
      aktion: String(l.aktion),
      wer: namen.get(String(l.erstellt_von ?? '')) ?? 'Verwaltung',
      betrag: l.betrag_eur != null ? Number(l.betrag_eur) : null,
      notiz: l.notiz ?? null,
    })),
    nachrichten: (kommRes.data ?? []).map((n) => ({
      id: String(n.id),
      wann: String(n.created_at),
      von: n.actor_name?.trim() || (n.actor_rolle === 'teo' ? 'Servus TEO' : 'Verwaltung'),
      vonTeo: n.actor_rolle === 'teo',
      text: String(n.text ?? ''),
    })),
    termine: (einsRes.data ?? []).map((e) => ({
      id: String(e.id),
      von: String(e.termin_von),
      bis: e.termin_bis ? String(e.termin_bis) : null,
      titel: String(e.titel ?? 'Termin'),
    })),
  }
}
