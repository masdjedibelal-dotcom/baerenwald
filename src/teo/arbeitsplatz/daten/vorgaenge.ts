import 'server-only'

import { logDbError } from '@/lib/errors/log-db-error'
import { supabaseAdmin } from '@/lib/supabase'
import { resolveVorgang } from '@/lib/crm-vorgang/resolve-vorgang'
import { resolveAngebotGesamtBrutto } from '@/lib/portal/portal-angebot-display'
import type { ApKontext } from '@/teo/arbeitsplatz/kontext'
import { darf } from '@/teo/arbeitsplatz/rechte'
import { apStatus, type ApStatus } from '@/teo/arbeitsplatz/vorgang-status'

export type ApVorgangZeile = {
  id: string
  titel: string
  status: ApStatus
  objektId: string | null
  objektName: string | null
  melder: string | null
  dringend: boolean
  erstellt: string
  aktualisiert: string
  /** Angebotswert brutto (wie im Portal berechnet) — nur wenn die Person Kosten sehen darf */
  betrag: number | null
  /** Abgerechnet (Rechnungen, brutto) — nur mit Kostenrecht */
  abgerechnet: number | null
}

const LEAD_SPALTEN =
  'id, status, situation, bereiche, funnel_daten, kanal, anlass, erfassung_von, org_freigabe_status, hv_meldung_status, freigabe_bypass_grund, kontakt_name, melder_name, plz, created_at, updated_at, kunde_objekt_id, kunde_id, auftraggeber_kunde_id'

type LeadRoh = Record<string, unknown> & { id: string; created_at: string; kunde_objekt_id: string | null }

function zahl(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  return Number.isFinite(n) ? n : null
}

/**
 * Alle Vorgänge der Organisation, die die Person sehen darf (neueste zuerst).
 * Organisation = Lead gehört ihr (kunde_id) oder sie ist Auftraggeber (Meldungen).
 */
export async function ladeVorgaenge(k: ApKontext, opts: { nurIds?: string[] } = {}): Promise<ApVorgangZeile[]> {
  let q = supabaseAdmin
    .from('leads')
    .select(LEAD_SPALTEN)
    .or(`kunde_id.eq.${k.org.id},auftraggeber_kunde_id.eq.${k.org.id}`)
    .is('geloescht_am', null)
    .order('created_at', { ascending: false })
    .limit(1000)
  if (k.person.objektIds !== null) q = q.in('kunde_objekt_id', k.person.objektIds.length ? k.person.objektIds : ['-'])
  if (opts.nurIds) q = q.in('id', opts.nurIds.length ? opts.nurIds : ['-'])
  const { data: leadsRoh, error } = await q
  if (error) {
    logDbError('teo/arbeitsplatz/daten/vorgaenge:leads', error)
    return []
  }
  const leads = (leadsRoh ?? []) as unknown as LeadRoh[]
  if (!leads.length) return []
  const ids = leads.map((l) => l.id)

  const [angRes, aufRes, objRes] = await Promise.all([
    supabaseAdmin
      .from('angebote')
      .select('id, lead_id, status, status_einfach, created_at, updated_at, gesendet_am, gesendet_kunde_at, leistungsumfang, gesamt_fix, gesamt_min, gesamt_max, positionen')
      .in('lead_id', ids),
    supabaseAdmin.from('auftraege').select('id, lead_id, angebot_id, status, titel, created_at, updated_at').in('lead_id', ids),
    supabaseAdmin.from('kunden_objekte').select('id, titel, strasse, hausnummer').eq('kunde_id', k.org.id),
  ])
  if (angRes.error) logDbError('teo/arbeitsplatz/daten/vorgaenge:angebote', angRes.error)
  if (aufRes.error) logDbError('teo/arbeitsplatz/daten/vorgaenge:auftraege', aufRes.error)
  if (objRes.error) logDbError('teo/arbeitsplatz/daten/vorgaenge:objekte', objRes.error)
  const auftraege = (aufRes.data ?? []) as Array<Record<string, unknown> & { id: string; lead_id: string; status: string; created_at: string }>
  const angebote = (angRes.data ?? []) as Array<Record<string, unknown> & { id: string; lead_id: string; created_at: string }>

  const rechRes = auftraege.length
    ? await supabaseAdmin
        .from('rechnungen')
        .select('id, auftrag_id, status, created_at, updated_at, rechnung_art, abschlag_index, beleg_typ, brutto, richtung')
        .in('auftrag_id', auftraege.map((a) => a.id))
    : { data: [], error: null }
  if (rechRes.error) logDbError('teo/arbeitsplatz/daten/vorgaenge:rechnungen', rechRes.error)
  const rechnungen = ((rechRes.data ?? []) as Array<Record<string, unknown> & { id: string; auftrag_id: string; status: string; created_at: string }>).filter(
    (r) => (r.richtung ?? 'ausgang') !== 'eingang'
  )

  const objektName = new Map(
    ((objRes.data ?? []) as Array<{ id: string; titel: string | null; strasse: string | null; hausnummer: string | null }>).map((o) => [
      String(o.id),
      o.titel?.trim() || [o.strasse, o.hausnummer].filter(Boolean).join(' ') || 'Objekt',
    ])
  )
  const kosten = darf(k.person, 'kosten.sehen')

  return leads.map((lead) => {
    const ang = angebote.filter((a) => a.lead_id === lead.id)
    const auf = auftraege.filter((a) => a.lead_id === lead.id)
    const rech = rechnungen.filter((r) => auf.some((a) => a.id === r.auftrag_id))
    const v = resolveVorgang({
      lead: lead as never,
      angebote: ang as never,
      auftraege: auf as never,
      rechnungen: rech as never,
    })
    const status = apStatus(lead as { hv_meldung_status?: string; org_freigabe_status?: string }, v)
    const beauftragtesAngebot = ang.find((a) => auf.some((x) => x.angebot_id === a.id)) ?? ang[0]
    const betrag = beauftragtesAngebot
      ? resolveAngebotGesamtBrutto({
          positionen: beauftragtesAngebot.positionen,
          gesamt_fix: zahl(beauftragtesAngebot.gesamt_fix),
          gesamt_min: zahl(beauftragtesAngebot.gesamt_min),
          gesamt_max: zahl(beauftragtesAngebot.gesamt_max),
        }) ?? null
      : null
    const abgerechnet = rech
      .filter((r) => r.status !== 'entwurf' && r.status !== 'storniert' && (r.beleg_typ ?? 'rechnung') === 'rechnung')
      .reduce((s, r) => s + (zahl(r.brutto) ?? 0), 0)
    const objektId = lead.kunde_objekt_id ? String(lead.kunde_objekt_id) : null
    return {
      id: lead.id,
      titel: v.titel || 'Vorgang',
      status,
      objektId,
      objektName: objektId ? objektName.get(objektId) ?? null : null,
      melder: (lead.melder_name as string | null)?.trim() || (lead.kontakt_name as string | null)?.trim() || null,
      dringend: Boolean(v.badges.notfall),
      erstellt: lead.created_at,
      aktualisiert: v.updatedAt || (lead.updated_at as string | null) || lead.created_at,
      betrag: kosten ? betrag : null,
      abgerechnet: kosten && abgerechnet > 0 ? abgerechnet : null,
    }
  })
}
