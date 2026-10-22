'use server'

import { revalidatePath } from 'next/cache'

import { logDbError } from '@/lib/errors/log-db-error'
import { supabaseAdmin } from '@/lib/supabase'
import type { ApAktionsErgebnis } from '@/teo/arbeitsplatz/aktionen/vorgang'
import { ladeApKontext, type ApKontext } from '@/teo/arbeitsplatz/kontext'
import { darf, siehtObjekt, type ApAktion } from '@/teo/arbeitsplatz/rechte'

async function pruefen(objektId: string, aktion: ApAktion): Promise<{ ok: true; k: ApKontext } | { ok: false; fehler: string }> {
  const k = await ladeApKontext()
  if (!k) return { ok: false, fehler: 'Bitte melden Sie sich erneut an.' }
  if (!darf(k.person, aktion) || !siehtObjekt(k.person, objektId)) return { ok: false, fehler: 'Dafür fehlt Ihnen die Berechtigung.' }
  const { data } = await supabaseAdmin.from('kunden_objekte').select('id').eq('id', objektId).eq('kunde_id', k.org.id).maybeSingle()
  if (!data) return { ok: false, fehler: 'Objekt nicht gefunden.' }
  return { ok: true, k }
}

export type MitteilungFelder = { titel: string; text: string; gueltigBis: string }

export async function mitteilungSpeichern(objektId: string, id: string | null, f: MitteilungFelder): Promise<ApAktionsErgebnis & { id?: string }> {
  const p = await pruefen(objektId, 'objekte.bearbeiten')
  if (!p.ok) return p
  const titel = f.titel.trim().slice(0, 120)
  if (!titel) return { ok: false, fehler: 'Bitte eine Überschrift eingeben.' }
  const gueltigBis = /^\d{4}-\d{2}-\d{2}$/.test(f.gueltigBis) ? f.gueltigBis : null
  const werte = { titel, text: f.text.trim().slice(0, 4000), gueltig_bis: gueltigBis }
  const { data, error } = id
    ? await supabaseAdmin.from('teo_mitteilungen').update(werte).eq('id', id).eq('kunde_id', p.k.org.id).eq('kunde_objekt_id', objektId).select('id').single()
    : await supabaseAdmin
        .from('teo_mitteilungen')
        .insert({ ...werte, kunde_id: p.k.org.id, kunde_objekt_id: objektId, erstellt_von: p.k.userId || null, erstellt_name: p.k.person.name })
        .select('id')
        .single()
  if (error || !data) {
    logDbError('teo/arbeitsplatz/aktionen/haus:mitteilung', error)
    return { ok: false, fehler: 'Mitteilung konnte nicht gespeichert werden.' }
  }
  revalidatePath(`/arbeitsplatz/objekte/${objektId}`)
  return { ok: true, id: String(data.id) }
}

export async function mitteilungEntfernen(objektId: string, id: string): Promise<ApAktionsErgebnis> {
  const p = await pruefen(objektId, 'objekte.bearbeiten')
  if (!p.ok) return p
  const { error } = await supabaseAdmin.from('teo_mitteilungen').update({ aktiv: false }).eq('id', id).eq('kunde_id', p.k.org.id)
  if (error) {
    logDbError('teo/arbeitsplatz/aktionen/haus:mitteilung-entfernen', error)
    return { ok: false, fehler: 'Mitteilung konnte nicht entfernt werden.' }
  }
  revalidatePath(`/arbeitsplatz/objekte/${objektId}`)
  return { ok: true }
}

export async function dokumentAendern(objektId: string, id: string, f: { name: string; fuerBewohner: boolean }): Promise<ApAktionsErgebnis> {
  const p = await pruefen(objektId, 'dokumente.hochladen')
  if (!p.ok) return p
  const name = f.name.trim().slice(0, 160)
  if (!name) return { ok: false, fehler: 'Bitte einen Namen eingeben.' }
  const { error } = await supabaseAdmin
    .from('kunden_dokumente')
    .update({ name, fuer_bewohner: f.fuerBewohner })
    .eq('id', id)
    .eq('kunde_id', p.k.org.id)
    .eq('kunde_objekt_id', objektId)
  if (error) {
    logDbError('teo/arbeitsplatz/aktionen/haus:dokument', error)
    return { ok: false, fehler: 'Dokument konnte nicht gespeichert werden.' }
  }
  revalidatePath(`/arbeitsplatz/objekte/${objektId}`)
  return { ok: true }
}

export async function dokumentEntfernen(objektId: string, id: string): Promise<ApAktionsErgebnis> {
  const p = await pruefen(objektId, 'dokumente.hochladen')
  if (!p.ok) return p
  const { error } = await supabaseAdmin.from('kunden_dokumente').delete().eq('id', id).eq('kunde_id', p.k.org.id).eq('kunde_objekt_id', objektId)
  if (error) {
    logDbError('teo/arbeitsplatz/aktionen/haus:dokument-entfernen', error)
    return { ok: false, fehler: 'Dokument konnte nicht entfernt werden.' }
  }
  revalidatePath(`/arbeitsplatz/objekte/${objektId}`)
  return { ok: true }
}

export type EinheitFelder = { bezeichnung: string; lage: string; notiz: string }

export async function einheitSpeichern(objektId: string, id: string | null, f: EinheitFelder): Promise<ApAktionsErgebnis> {
  const p = await pruefen(objektId, 'objekte.bearbeiten')
  if (!p.ok) return p
  const bezeichnung = f.bezeichnung.trim().slice(0, 80)
  if (!bezeichnung) return { ok: false, fehler: 'Bitte eine Bezeichnung eingeben.' }
  const werte = { bezeichnung, lage: f.lage.trim().slice(0, 120) || null, notiz: f.notiz.trim().slice(0, 2000) || null }
  const { error } = id
    ? await supabaseAdmin.from('teo_einheiten').update(werte).eq('id', id).eq('kunde_id', p.k.org.id).eq('kunde_objekt_id', objektId)
    : await supabaseAdmin.from('teo_einheiten').insert({ ...werte, kunde_id: p.k.org.id, kunde_objekt_id: objektId })
  if (error) {
    logDbError('teo/arbeitsplatz/aktionen/haus:einheit', error)
    return { ok: false, fehler: 'Einheit konnte nicht gespeichert werden.' }
  }
  revalidatePath(`/arbeitsplatz/objekte/${objektId}`)
  return { ok: true }
}

export async function einheitEntfernen(objektId: string, id: string): Promise<ApAktionsErgebnis> {
  const p = await pruefen(objektId, 'objekte.bearbeiten')
  if (!p.ok) return p
  const { error } = await supabaseAdmin.from('teo_einheiten').update({ aktiv: false }).eq('id', id).eq('kunde_id', p.k.org.id)
  if (error) {
    logDbError('teo/arbeitsplatz/aktionen/haus:einheit-entfernen', error)
    return { ok: false, fehler: 'Einheit konnte nicht entfernt werden.' }
  }
  revalidatePath(`/arbeitsplatz/objekte/${objektId}`)
  return { ok: true }
}
