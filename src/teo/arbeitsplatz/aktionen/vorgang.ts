'use server'

import { revalidatePath } from 'next/cache'

import { logDbError } from '@/lib/errors/log-db-error'
import { supabaseAdmin } from '@/lib/supabase'
import { ladeVorgaenge } from '@/teo/arbeitsplatz/daten/vorgaenge'
import { ladeApKontext, type ApKontext } from '@/teo/arbeitsplatz/kontext'
import { darf, type ApAktion } from '@/teo/arbeitsplatz/rechte'
import { freigabeEntscheiden, meldungAblehnen, meldungAnTeo } from '@/teo/hv/vorgang-aktionen'

export type ApAktionsErgebnis = { ok: true } | { ok: false; fehler: string }

/** Login + Recht + Sichtbarkeit des Vorgangs — vor jeder Änderung. */
async function pruefen(leadId: string, aktion: ApAktion): Promise<{ ok: true; k: ApKontext } | { ok: false; fehler: string }> {
  const k = await ladeApKontext()
  if (!k) return { ok: false, fehler: 'Bitte melden Sie sich erneut an.' }
  if (!darf(k.person, aktion)) return { ok: false, fehler: 'Dafür fehlt Ihnen die Berechtigung.' }
  const [v] = await ladeVorgaenge(k, { nurIds: [leadId] })
  if (!v) return { ok: false, fehler: 'Vorgang nicht gefunden.' }
  return { ok: true, k }
}

function fertig(leadId: string): ApAktionsErgebnis {
  revalidatePath('/arbeitsplatz', 'layout')
  revalidatePath(`/arbeitsplatz/vorgaenge/${leadId}`)
  return { ok: true }
}

export async function anTeoGeben(leadId: string): Promise<ApAktionsErgebnis> {
  const p = await pruefen(leadId, 'vorgang.an_teo')
  if (!p.ok) return p
  const r = await meldungAnTeo(p.k.org.id, leadId, { wirKuemmernMail: true })
  return r.ok ? fertig(leadId) : { ok: false, fehler: r.error }
}

export async function meldungAbweisen(leadId: string): Promise<ApAktionsErgebnis> {
  const p = await pruefen(leadId, 'vorgang.an_teo')
  if (!p.ok) return p
  const r = await meldungAblehnen(p.k.org.id, leadId)
  return r.ok ? fertig(leadId) : { ok: false, fehler: r.error }
}

export async function angebotEntscheiden(
  leadId: string,
  aktion: 'freigegeben' | 'abgelehnt',
  opts: { notiz?: string | null; betragEur?: number | null } = {}
): Promise<ApAktionsErgebnis> {
  const p = await pruefen(leadId, 'vorgang.freigeben')
  if (!p.ok) return p
  const r = await freigabeEntscheiden(p.k.org.id, leadId, aktion, {
    userId: p.k.userId,
    rolle: p.k.person.istAdmin ? 'admin' : 'verwaltung',
    notiz: opts.notiz ?? null,
    betragEur: opts.betragEur ?? null,
  })
  return r.ok ? fertig(leadId) : { ok: false, fehler: r.error }
}

/** Nachricht der Verwaltung an TEO — erscheint im CRM im Verlauf des Vorgangs. */
export async function nachrichtAnTeo(leadId: string, text: string): Promise<ApAktionsErgebnis> {
  const inhalt = text.trim()
  if (!inhalt) return { ok: false, fehler: 'Bitte eine Nachricht eingeben.' }
  if (inhalt.length > 4000) return { ok: false, fehler: 'Die Nachricht ist zu lang.' }
  const p = await pruefen(leadId, 'vorgang.nachricht')
  if (!p.ok) return p
  const { error } = await supabaseAdmin.from('vorgang_kommentare').insert({
    lead_id: leadId,
    kunde_id: p.k.org.id,
    actor_rolle: 'verwaltung',
    actor_name: p.k.person.name,
    text: inhalt,
  })
  if (error) {
    logDbError('teo/arbeitsplatz/aktionen/vorgang:nachricht', error)
    return { ok: false, fehler: 'Nachricht konnte nicht gesendet werden.' }
  }
  const { error: tlErr } = await supabaseAdmin.from('lead_timeline').insert({
    lead_id: leadId,
    typ: 'org_nachricht',
    titel: `Nachricht von ${p.k.person.name} (${p.k.org.name})`,
    beschreibung: inhalt,
    erstellt_von: p.k.userId,
  })
  if (tlErr) logDbError('teo/arbeitsplatz/aktionen/vorgang:timeline', tlErr)
  return fertig(leadId)
}

export type NeuerVorgang = {
  objektId: string
  beschreibung: string
  dringend: boolean
  kontaktName?: string
  kontaktTelefon?: string
  fotos?: string[]
}

/** Vorgang von der Verwaltung anlegen — geht direkt an TEO (keine eigene Meldungs-Entscheidung). */
export async function vorgangAnlegen(v: NeuerVorgang): Promise<ApAktionsErgebnis & { id?: string }> {
  const k = await ladeApKontext()
  if (!k) return { ok: false, fehler: 'Bitte melden Sie sich erneut an.' }
  if (!darf(k.person, 'vorgang.anlegen')) return { ok: false, fehler: 'Dafür fehlt Ihnen die Berechtigung.' }
  const beschreibung = v.beschreibung.trim()
  if (beschreibung.length < 5) return { ok: false, fehler: 'Bitte kurz beschreiben, was zu tun ist.' }
  if (k.person.objektIds !== null && !k.person.objektIds.includes(v.objektId)) return { ok: false, fehler: 'Objekt nicht gefunden.' }

  const { data: objekt, error: oErr } = await supabaseAdmin
    .from('kunden_objekte')
    .select('id, plz, strasse, hausnummer, ort')
    .eq('id', v.objektId)
    .eq('kunde_id', k.org.id)
    .maybeSingle()
  if (oErr) logDbError('teo/arbeitsplatz/aktionen/vorgang:objekt', oErr)
  if (!objekt) return { ok: false, fehler: 'Objekt nicht gefunden.' }

  const fotos = (v.fotos ?? []).filter((u) => /^https?:\/\//.test(u)).slice(0, 8)
  const kontakt = { name: v.kontaktName?.trim() || null, telefon: v.kontaktTelefon?.trim() || null }
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
    kanal: 'hv_direkt',
    anlass: 'meldung',
    erfassung_von: 'organisation',
    kunde_objekt_id: v.objektId,
    kundentyp: 'hausverwaltung',
    hv_meldung_status: 'angebot_eingefordert',
    org_freigabe_status: 'nicht_noetig',
    melder_name: k.person.name,
    melder_email: k.person.email,
    melder_telefon: kontakt.telefon,
    skipKundeMail: true,
    skipInternMail: true,
    notizen: [beschreibung, kontakt.name || kontakt.telefon ? `Kontakt vor Ort: ${[kontakt.name, kontakt.telefon].filter(Boolean).join(', ')}` : null]
      .filter(Boolean)
      .join('\n\n'),
    funnel_daten: { quelle: 'hv_direkt', beschreibung, fotos, kontakt_vor_ort: kontakt, ...(objekt.ort ? { ort: String(objekt.ort) } : {}) },
    funnel_quelle: 'hv_direkt',
  })
  if (!r.ok) {
    console.error('[arbeitsplatz/vorgang-anlegen] persistLead:', r.error)
    return { ok: false, fehler: 'Vorgang konnte nicht angelegt werden.' }
  }
  const { finalizeOrgSelfCreatedLead } = await import('@/lib/org/finalize-org-self-created-lead')
  await finalizeOrgSelfCreatedLead(r.id)
  const { notifyCrmOrgPortal } = await import('@/lib/org/notify-crm-org')
  const n = await notifyCrmOrgPortal({ leadId: r.id, typ: 'meldung' })
  if (!n.ok) console.warn('[arbeitsplatz/vorgang-anlegen] CRM-Notify:', n.error)
  revalidatePath('/arbeitsplatz', 'layout')
  return { ok: true, id: r.id }
}
