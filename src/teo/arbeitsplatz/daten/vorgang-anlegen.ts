import 'server-only'

import { logDbError } from '@/lib/errors/log-db-error'
import { supabaseAdmin } from '@/lib/supabase'
import type { ApKontext } from '@/teo/arbeitsplatz/kontext'

export type NeuerVorgang = {
  objektId: string
  beschreibung: string
  dringend: boolean
  kontaktName?: string
  kontaktTelefon?: string
  /** Einheit (Bezeichnung) — optional */
  einheit?: string
  fotos?: string[]
}

/**
 * Vorgang für die Organisation anlegen (ohne Rechteprüfung — macht der Aufrufer).
 * Verwaltung: geht direkt an TEO. Team/Eigentümer: landet als „Neu“ bei der Verwaltung.
 */
export async function legeVorgangAn(k: ApKontext, v: NeuerVorgang): Promise<{ ok: true; id: string } | { ok: false; fehler: string }> {
  const beschreibung = v.beschreibung.trim()
  if (beschreibung.length < 5) return { ok: false, fehler: 'Bitte kurz beschreiben, was zu tun ist.' }
  if (k.person.objektIds !== null && !k.person.objektIds.includes(v.objektId)) return { ok: false, fehler: 'Objekt nicht gefunden.' }

  const { data: objekt, error: oErr } = await supabaseAdmin
    .from('kunden_objekte')
    .select('id, plz, strasse, hausnummer, ort')
    .eq('id', v.objektId)
    .eq('kunde_id', k.org.id)
    .maybeSingle()
  if (oErr) logDbError('teo/arbeitsplatz/vorgang-anlegen:objekt', oErr)
  if (!objekt) return { ok: false, fehler: 'Objekt nicht gefunden.' }

  const direktAnTeo = k.person.rolle === 'verwaltung'
  const fotos = (v.fotos ?? []).filter((u) => /^https?:\/\//.test(u)).slice(0, 8)
  const kontakt = { name: v.kontaktName?.trim() || null, telefon: v.kontaktTelefon?.trim() || null }
  const kanal = direktAnTeo ? 'hv_direkt' : 'hv_melder_link'
  const { persistLead } = await import('@/lib/lead/persist-lead')
  const r = await persistLead({
    kunde_id: k.org.id,
    auftraggeber_kunde_id: k.org.id,
    name: k.person.name,
    email: k.person.email,
    plz: String(objekt.plz ?? ''),
    strasse: String(objekt.strasse ?? ''),
    hausnummer: String(objekt.hausnummer ?? ''),
    ort: objekt.ort ? String(objekt.ort) : undefined,
    situation: v.dringend ? 'notfall' : 'reparatur',
    bereiche: [],
    zeitraum: v.dringend ? 'sofort' : 'diese_woche',
    kanal,
    anlass: 'meldung',
    erfassung_von: 'organisation',
    kunde_objekt_id: v.objektId,
    kundentyp: 'hausverwaltung',
    hv_meldung_status: direktAnTeo ? 'angebot_eingefordert' : 'neu',
    org_freigabe_status: 'nicht_noetig',
    melder_name: k.person.name,
    melder_email: k.person.email,
    melder_telefon: kontakt.telefon,
    melder_einheit: v.einheit?.trim().slice(0, 80) || null,
    skipKundeMail: true,
    skipInternMail: true,
    notizen: [beschreibung, kontakt.name || kontakt.telefon ? `Kontakt vor Ort: ${[kontakt.name, kontakt.telefon].filter(Boolean).join(', ')}` : null]
      .filter(Boolean)
      .join('\n\n'),
    funnel_daten: { quelle: kanal, beschreibung, fotos, kontakt_vor_ort: kontakt, ...(objekt.ort ? { ort: String(objekt.ort) } : {}) },
    funnel_quelle: kanal,
  })
  if (!r.ok) {
    console.error('[arbeitsplatz/vorgang-anlegen] persistLead:', r.error)
    return { ok: false, fehler: 'Vorgang konnte nicht angelegt werden.' }
  }
  const { finalizeOrgSelfCreatedLead } = await import('@/lib/org/finalize-org-self-created-lead')
  await finalizeOrgSelfCreatedLead(r.id)
  if (direktAnTeo) {
    const { notifyCrmOrgPortal } = await import('@/lib/org/notify-crm-org')
    const n = await notifyCrmOrgPortal({ leadId: r.id, typ: 'meldung' })
    if (!n.ok) console.warn('[arbeitsplatz/vorgang-anlegen] CRM-Notify:', n.error)
  }
  return { ok: true, id: r.id }
}
