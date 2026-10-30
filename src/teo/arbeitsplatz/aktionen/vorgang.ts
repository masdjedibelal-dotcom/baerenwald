'use server'

import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'

import { SITE_CONFIG } from '@/lib/config'
import { buildStandardMailHtml, mailBegruessungHtml, mailPrimaryButtonHtml, mailTeamGrussHtml } from '@/lib/email/mail-shell'
import { sendBrandedMail } from '@/lib/email/send-branded-mail'
import { logDbError } from '@/lib/errors/log-db-error'
import { MARKE } from '@/lib/marke'
import { supabaseAdmin } from '@/lib/supabase'
import { ladeVorgaenge } from '@/teo/arbeitsplatz/daten/vorgaenge'
import { ladeApKontext, type ApKontext } from '@/teo/arbeitsplatz/kontext'
import { darf, type ApAktion } from '@/teo/arbeitsplatz/rechte'
import { legeVorgangAn, type NeuerVorgang } from '@/teo/arbeitsplatz/daten/vorgang-anlegen'
import { freigabeEntscheiden, meldungAblehnen, meldungAnTeam, meldungAnTeo, teamErgebnis } from '@/teo/hv/vorgang-aktionen'

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

/** Neue Meldung an eine Person aus dem Team (Hausmeister …) — prüft, ob sie das Objekt betreut. */
export async function anTeamGeben(leadId: string, mitgliedId: string): Promise<ApAktionsErgebnis> {
  const p = await pruefen(leadId, 'vorgang.an_teo')
  if (!p.ok) return p
  const [v] = await ladeVorgaenge(p.k, { nurIds: [leadId] })
  const { data: m, error } = await supabaseAdmin
    .from('kunden_mitglieder')
    .select('id, name, email')
    .eq('id', mitgliedId)
    .eq('kunde_id', p.k.org.id)
    .eq('rolle', 'team')
    .eq('aktiv', true)
    .maybeSingle()
  if (error) logDbError('teo/arbeitsplatz/aktionen/vorgang:team-person', error)
  if (!m) return { ok: false, fehler: 'Person nicht gefunden.' }
  if (v?.objektId) {
    const { data: z } = await supabaseAdmin.from('mitglied_objekte').select('kunde_objekt_id').eq('mitglied_id', mitgliedId).eq('kunde_objekt_id', v.objektId).maybeSingle()
    if (!z) return { ok: false, fehler: 'Diese Person betreut das Objekt nicht.' }
  }
  const name = (m.name as string | null)?.trim() || String(m.email ?? 'Team')
  const r = await meldungAnTeam(p.k.org.id, leadId, { id: String(m.id), name })
  if (!r.ok) return { ok: false, fehler: r.error }
  if (m.email) await teamAufgabeMail(p.k, String(m.email), name, v?.titel ?? 'Neuer Vorgang', v?.objektName ?? null)
  return fertig(leadId)
}

async function teamAufgabeMail(k: ApKontext, email: string, name: string, titel: string, objekt: string | null) {
  const key = process.env.RESEND_API_KEY
  if (!key) return
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const html = buildStandardMailHtml({
    preheader: `Neue Aufgabe von ${k.org.name}`,
    bodyHtml: [
      `<p>${mailBegruessungHtml('sie', name)}</p>`,
      `<p><strong>${esc(k.person.name)}</strong> von <strong>${esc(k.org.name)}</strong> hat Ihnen einen Vorgang gegeben:</p>`,
      `<p><strong>${esc(titel)}</strong>${objekt ? `<br>${esc(objekt)}` : ''}</p>`,
      `<p>Bitte schauen Sie sich das an und tragen Sie in der App ein, ob es erledigt ist oder ein Fachbetrieb kommen muss.</p>`,
      mailPrimaryButtonHtml('Aufgabe öffnen', `${SITE_CONFIG.url}/team`),
      `<p>${mailTeamGrussHtml('sie')}</p>`,
    ].join(''),
  })
  try {
    await sendBrandedMail(new Resend(key), {
      from: process.env.RESEND_FROM_SYSTEM ?? `${MARKE.name} <system@${MARKE.websiteHost}>`,
      to: email,
      subject: `Neue Aufgabe: ${titel}`,
      html,
    })
  } catch (e) {
    console.error('[arbeitsplatz/an-team] mail:', e)
  }
}

/** Ergebnis vom Team: selbst erledigt oder braucht Fachbetrieb (geht mit Befund an TEO). */
export async function teamErgebnisMelden(
  leadId: string,
  e: { ergebnis: 'erledigt' | 'fachbetrieb'; notiz: string; fotos: string[] }
): Promise<ApAktionsErgebnis> {
  const p = await pruefen(leadId, 'vorgang.team_ergebnis')
  if (!p.ok) return p
  if (!p.k.person.mitgliedId) return { ok: false, fehler: 'Dafür fehlt Ihnen die Berechtigung.' }
  const notiz = e.notiz.trim().slice(0, 2000) || null
  if (e.ergebnis === 'fachbetrieb' && !notiz) return { ok: false, fehler: 'Bitte kurz beschreiben, was Sie gesehen haben.' }
  const fotos = e.fotos.filter((u) => /^https?:\/\//.test(u)).slice(0, 8)
  const r = await teamErgebnis(p.k.org.id, leadId, { id: p.k.person.mitgliedId, name: p.k.person.name }, { ergebnis: e.ergebnis, notiz, fotos })
  if (!r.ok) return { ok: false, fehler: r.error }
  revalidatePath('/team')
  return fertig(leadId)
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
