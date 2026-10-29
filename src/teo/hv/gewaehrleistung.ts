import 'server-only'

import { logDbError } from '@/lib/errors/log-db-error'
import { generateMeldeTrackingToken } from '@/lib/melde/melde-tracking'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * Gewährleistung (nur TEO): „Problem ist wieder da“ bei einem erledigten Vorgang.
 * Legt einen neuen Vorgang mit Bezug auf den alten an — direkt bei TEO, ohne Freigabe der Verwaltung.
 * Kein eigener Mängel-Ablauf: teo sieht den Bezug in der Notiz und beauftragt denselben Betrieb.
 */
export type GewaehrleistungVon =
  | { art: 'verwaltung'; name: string; email: string | null }
  | { art: 'mieter' }

export async function legeGewaehrleistungAn(
  ursprungId: string,
  beschreibung: string,
  von: GewaehrleistungVon
): Promise<{ ok: true; id: string; statusToken: string | null } | { ok: false; fehler: string }> {
  const text = beschreibung.trim()
  if (text.length < 5) return { ok: false, fehler: 'Bitte kurz beschreiben, was wieder auftritt.' }

  const { data: alt, error } = await supabaseAdmin
    .from('leads')
    .select(
      'id, kunde_id, auftraggeber_kunde_id, kunde_objekt_id, plz, strasse, hausnummer, bereiche, kontakt_nachricht, funnel_daten, melder_name, melder_email, melder_telefon, melder_einheit, created_at'
    )
    .eq('id', ursprungId)
    .maybeSingle()
  if (error) logDbError('teo/hv/gewaehrleistung:ursprung', error)
  if (!alt) return { ok: false, fehler: 'Vorgang nicht gefunden.' }

  // Schon gemeldet und noch offen → nicht doppelt anlegen
  const { data: offen, error: dupErr } = await supabaseAdmin
    .from('leads')
    .select('id, melde_tracking_token')
    .contains('funnel_daten', { gewaehrleistung_zu: ursprungId })
    .is('geloescht_am', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (dupErr) logDbError('teo/hv/gewaehrleistung:duplikat', dupErr)
  if (offen?.id) return { ok: true, id: String(offen.id), statusToken: offen.melde_tracking_token ? String(offen.melde_tracking_token) : null }

  const fd = (alt.funnel_daten ?? {}) as Record<string, unknown>
  const altTitel = String(fd.beschreibung ?? alt.kontakt_nachricht ?? 'Vorgang').split('\n')[0]!.slice(0, 80)
  const altDatum = String(alt.created_at).slice(0, 10).split('-').reverse().join('.')
  const kanal = von.art === 'verwaltung' ? 'hv_direkt' : 'hv_melder_link'
  const name = von.art === 'verwaltung' ? von.name : String(alt.melder_name ?? 'Mieter')
  const email = von.art === 'verwaltung' ? von.email : alt.melder_email ? String(alt.melder_email) : null

  const { persistLead } = await import('@/lib/lead/persist-lead')
  const r = await persistLead({
    kunde_id: alt.kunde_id ? String(alt.kunde_id) : undefined,
    auftraggeber_kunde_id: alt.auftraggeber_kunde_id ? String(alt.auftraggeber_kunde_id) : undefined,
    name,
    email: email ?? undefined,
    plz: String(alt.plz ?? ''),
    strasse: String(alt.strasse ?? ''),
    hausnummer: String(alt.hausnummer ?? ''),
    situation: 'reparatur',
    bereiche: Array.isArray(alt.bereiche) ? (alt.bereiche as string[]) : [],
    zeitraum: 'diese_woche',
    kanal,
    anlass: 'meldung',
    erfassung_von: von.art === 'verwaltung' ? 'organisation' : 'melder',
    kunde_objekt_id: alt.kunde_objekt_id ? String(alt.kunde_objekt_id) : undefined,
    kundentyp: 'hausverwaltung',
    hv_meldung_status: 'angebot_eingefordert',
    org_freigabe_status: 'nicht_noetig',
    melder_name: alt.melder_name ? String(alt.melder_name) : name,
    melder_email: alt.melder_email ? String(alt.melder_email) : email,
    melder_telefon: alt.melder_telefon ? String(alt.melder_telefon) : null,
    melder_einheit: alt.melder_einheit ? String(alt.melder_einheit) : null,
    skipKundeMail: true,
    skipInternMail: true,
    // Titel = erste Zeile → der eigene Text; Bezug zum alten Vorgang darunter (ohne interne CRM-Adresse)
    notizen: [
      `Wieder aufgetreten: ${text}`,
      '',
      `Gewährleistung zu „${altTitel}“ vom ${altDatum}, gemeldet von ${von.art === 'verwaltung' ? 'der Verwaltung' : 'Mieter/in'}.`,
    ].join('\n'),
    funnel_daten: { quelle: kanal, beschreibung: `Wieder aufgetreten: ${text}`, gewaehrleistung_zu: ursprungId, fotos: [] },
    funnel_quelle: kanal,
  })
  if (!r.ok) {
    console.error('[teo/hv/gewaehrleistung] persistLead:', r.error)
    return { ok: false, fehler: 'Konnte nicht gemeldet werden. Bitte versuchen Sie es erneut.' }
  }

  let statusToken: string | null = null
  if (von.art === 'mieter') {
    statusToken = generateMeldeTrackingToken()
    const { error: tErr } = await supabaseAdmin
      .from('leads')
      .update({ melde_tracking_token: statusToken, vorgang_phase: 'eingegangen' })
      .eq('id', r.id)
    if (tErr) {
      logDbError('teo/hv/gewaehrleistung:token', tErr)
      statusToken = null
    }
  }

  const { finalizeOrgSelfCreatedLead } = await import('@/lib/org/finalize-org-self-created-lead')
  await finalizeOrgSelfCreatedLead(r.id)
  const { notifyCrmOrgPortal } = await import('@/lib/org/notify-crm-org')
  const n = await notifyCrmOrgPortal({ leadId: r.id, typ: 'meldung' })
  if (!n.ok) console.warn('[teo/hv/gewaehrleistung] CRM-Notify:', n.error)
  return { ok: true, id: r.id, statusToken }
}
