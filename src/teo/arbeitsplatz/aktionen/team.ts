'use server'

import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'

import { SITE_CONFIG } from '@/lib/config'
import { buildStandardMailHtml, mailBegruessungHtml, mailPrimaryButtonHtml, mailTeamGrussHtml } from '@/lib/email/mail-shell'
import { sendBrandedMail } from '@/lib/email/send-branded-mail'
import { logDbError } from '@/lib/errors/log-db-error'
import { MARKE } from '@/lib/marke'
import { supabaseAdmin } from '@/lib/supabase'
import { isValidEmail } from '@/lib/validation'
import type { ApAktionsErgebnis } from '@/teo/arbeitsplatz/aktionen/vorgang'
import { ladeApKontext, type ApKontext } from '@/teo/arbeitsplatz/kontext'
import { darf, ROLLEN_LABEL, type ApRolle } from '@/teo/arbeitsplatz/rechte'

const ROLLEN: ApRolle[] = ['verwaltung', 'team', 'eigentuemer']

export type PersonFelder = {
  name: string
  email?: string
  rolle: ApRolle
  istAdmin: boolean
  darfFreigeben: boolean
  objektIds: string[]
}

async function admin(): Promise<{ ok: true; k: ApKontext } | { ok: false; fehler: string }> {
  const k = await ladeApKontext()
  if (!k) return { ok: false, fehler: 'Bitte melden Sie sich erneut an.' }
  if (!darf(k.person, 'team.verwalten')) return { ok: false, fehler: 'Dafür fehlt Ihnen die Berechtigung.' }
  return { ok: true, k }
}

/** Nur Objekte der eigenen Organisation zulassen. */
async function eigeneObjekte(k: ApKontext, ids: string[]): Promise<string[]> {
  if (!ids.length) return []
  const { data } = await supabaseAdmin.from('kunden_objekte').select('id').eq('kunde_id', k.org.id).in('id', ids)
  return (data ?? []).map((o) => String(o.id))
}

async function zuordnungSetzen(mitgliedId: string, objektIds: string[]) {
  const { error: delErr } = await supabaseAdmin.from('mitglied_objekte').delete().eq('mitglied_id', mitgliedId)
  if (delErr) logDbError('teo/arbeitsplatz/aktionen/team:zuordnung-del', delErr)
  if (!objektIds.length) return
  const { error } = await supabaseAdmin
    .from('mitglied_objekte')
    .insert(objektIds.map((id) => ({ mitglied_id: mitgliedId, kunde_objekt_id: id })))
  if (error) logDbError('teo/arbeitsplatz/aktionen/team:zuordnung', error)
}

function felder(f: PersonFelder) {
  const rolle = ROLLEN.includes(f.rolle) ? f.rolle : 'verwaltung'
  return {
    name: f.name.trim().slice(0, 120),
    rolle,
    ist_admin: rolle === 'verwaltung' && f.istAdmin,
    darf_freigeben: rolle === 'verwaltung' && (f.darfFreigeben || f.istAdmin),
  }
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

async function einladungsMail(k: ApKontext, email: string, name: string, rolle: ApRolle) {
  const key = process.env.RESEND_API_KEY
  if (!key) return
  const link = `${SITE_CONFIG.url}/portal/registrieren?${new URLSearchParams({ email, name, locked: '1' })}`
  const html = buildStandardMailHtml({
    preheader: `${k.org.name} hat Sie zu ${MARKE.name} eingeladen.`,
    bodyHtml: [
      `<p>${mailBegruessungHtml('sie', name)}</p>`,
      `<p><strong>${esc(k.person.name)}</strong> von <strong>${esc(k.org.name)}</strong> hat Sie als <strong>${ROLLEN_LABEL[rolle]}</strong> eingeladen.</p>`,
      `<p>Legen Sie Ihr Passwort fest — danach sind Sie direkt drin. Haben Sie schon ein Konto mit dieser E-Mail, melden Sie sich einfach an.</p>`,
      mailPrimaryButtonHtml('Einladung annehmen', link),
      `<p>${mailTeamGrussHtml('sie')}</p>`,
    ].join(''),
  })
  try {
    await sendBrandedMail(new Resend(key), {
      from: process.env.RESEND_FROM_SYSTEM ?? `${MARKE.name} <system@${MARKE.websiteHost}>`,
      to: email,
      subject: `Einladung von ${k.org.name}`,
      html,
    })
  } catch (e) {
    console.error('[arbeitsplatz/einladen] mail:', e)
  }
}

export async function personEinladen(f: PersonFelder): Promise<ApAktionsErgebnis> {
  const p = await admin()
  if (!p.ok) return p
  const email = String(f.email ?? '').trim().toLowerCase()
  if (!isValidEmail(email)) return { ok: false, fehler: 'Bitte eine gültige E-Mail eingeben.' }
  if (!f.name.trim()) return { ok: false, fehler: 'Bitte einen Namen eingeben.' }

  const { data: vorhanden } = await supabaseAdmin
    .from('kunden_mitglieder')
    .select('id, aktiv')
    .eq('kunde_id', p.k.org.id)
    .ilike('email', email.replace(/[\\%_]/g, (z) => `\\${z}`))
    .maybeSingle()
  if (vorhanden?.aktiv) return { ok: false, fehler: 'Diese Person ist schon im Team.' }

  const werte = { ...felder(f), email, aktiv: true, eingeladen_von: p.k.userId, eingeladen_am: new Date().toISOString() }
  const { data, error } = vorhanden
    ? await supabaseAdmin.from('kunden_mitglieder').update(werte).eq('id', vorhanden.id).select('id').single()
    : await supabaseAdmin.from('kunden_mitglieder').insert({ ...werte, kunde_id: p.k.org.id }).select('id').single()
  if (error || !data) {
    logDbError('teo/arbeitsplatz/aktionen/team:einladen', error)
    return { ok: false, fehler: 'Einladung konnte nicht gespeichert werden.' }
  }
  if (werte.rolle !== 'verwaltung') await zuordnungSetzen(String(data.id), await eigeneObjekte(p.k, f.objektIds))
  await einladungsMail(p.k, email, werte.name, werte.rolle)
  revalidatePath('/arbeitsplatz/team')
  return { ok: true }
}

export async function personAendern(id: string, f: PersonFelder): Promise<ApAktionsErgebnis> {
  const p = await admin()
  if (!p.ok) return p
  if (!f.name.trim()) return { ok: false, fehler: 'Bitte einen Namen eingeben.' }
  const w = felder(f)
  if (p.k.person.mitgliedId === id && (!w.ist_admin || w.rolle !== 'verwaltung')) {
    return { ok: false, fehler: 'Ihre eigenen Admin-Rechte können Sie nicht entfernen.' }
  }
  const { error } = await supabaseAdmin.from('kunden_mitglieder').update(w).eq('id', id).eq('kunde_id', p.k.org.id)
  if (error) {
    logDbError('teo/arbeitsplatz/aktionen/team:aendern', error)
    return { ok: false, fehler: 'Änderung konnte nicht gespeichert werden.' }
  }
  await zuordnungSetzen(id, w.rolle === 'verwaltung' ? [] : await eigeneObjekte(p.k, f.objektIds))
  revalidatePath('/arbeitsplatz/team')
  return { ok: true }
}

export async function personEntfernen(id: string): Promise<ApAktionsErgebnis> {
  const p = await admin()
  if (!p.ok) return p
  if (p.k.person.mitgliedId === id) return { ok: false, fehler: 'Sich selbst können Sie nicht entfernen.' }
  const { error } = await supabaseAdmin.from('kunden_mitglieder').update({ aktiv: false }).eq('id', id).eq('kunde_id', p.k.org.id)
  if (error) {
    logDbError('teo/arbeitsplatz/aktionen/team:entfernen', error)
    return { ok: false, fehler: 'Person konnte nicht entfernt werden.' }
  }
  revalidatePath('/arbeitsplatz/team')
  return { ok: true }
}
