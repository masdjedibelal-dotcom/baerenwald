'use server'

import { revalidatePath } from 'next/cache'

import { logDbError } from '@/lib/errors/log-db-error'
import { supabaseAdmin } from '@/lib/supabase'
import { ladeVorgaenge } from '@/teo/arbeitsplatz/daten/vorgaenge'
import { ladeApKontext, type ApKontext } from '@/teo/arbeitsplatz/kontext'
import { darf, type ApAktion } from '@/teo/arbeitsplatz/rechte'
import { legeVorgangAn, type NeuerVorgang } from '@/teo/arbeitsplatz/daten/vorgang-anlegen'
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
  opts: { notiz?: string | null; betragEur?: number | null; beschlussLiegtVor?: boolean; beschlussUrl?: string | null } = {}
): Promise<ApAktionsErgebnis> {
  const p = await pruefen(leadId, 'vorgang.freigeben')
  if (!p.ok) return p
  const r = await freigabeEntscheiden(p.k.org.id, leadId, aktion, {
    userId: p.k.userId,
    rolle: p.k.person.istAdmin ? 'admin' : 'verwaltung',
    notiz: opts.notiz ?? null,
    betragEur: opts.betragEur ?? null,
    beschlussLiegtVor: aktion === 'freigegeben' && p.k.org.orgTyp === 'weg' ? Boolean(opts.beschlussLiegtVor) : false,
    beschlussUrl: aktion === 'freigegeben' && p.k.org.orgTyp === 'weg' ? opts.beschlussUrl ?? null : null,
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

export type { NeuerVorgang } from '@/teo/arbeitsplatz/daten/vorgang-anlegen'

/** Vorgang anlegen: Verwaltung → direkt an TEO, Team → als „Neu“ zur Verwaltung. */
export async function vorgangAnlegen(v: NeuerVorgang): Promise<ApAktionsErgebnis & { id?: string }> {
  const k = await ladeApKontext()
  if (!k) return { ok: false, fehler: 'Bitte melden Sie sich erneut an.' }
  if (!darf(k.person, 'vorgang.anlegen')) return { ok: false, fehler: 'Dafür fehlt Ihnen die Berechtigung.' }
  const r = await legeVorgangAn(k, v)
  if (!r.ok) return r
  revalidatePath('/arbeitsplatz', 'layout')
  return r
}

/** Gewährleistung: erledigter Vorgang, Problem ist wieder da → neuer Vorgang direkt bei TEO (nur Verwaltung). */
export async function wiederAufgetreten(leadId: string, beschreibung: string): Promise<ApAktionsErgebnis & { id?: string }> {
  const p = await pruefen(leadId, 'vorgang.an_teo')
  if (!p.ok) return p
  const [v] = await ladeVorgaenge(p.k, { nurIds: [leadId] })
  if (v?.status !== 'erledigt') return { ok: false, fehler: 'Das geht erst, wenn der Vorgang erledigt ist.' }
  const { legeGewaehrleistungAn } = await import('@/teo/hv/gewaehrleistung')
  const r = await legeGewaehrleistungAn(leadId, beschreibung, { art: 'verwaltung', name: p.k.person.name, email: p.k.person.email })
  if (!r.ok) return r
  revalidatePath('/arbeitsplatz', 'layout')
  return { ok: true, id: r.id }
}
