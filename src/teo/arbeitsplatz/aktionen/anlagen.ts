'use server'

import { revalidatePath } from 'next/cache'

import { logDbError } from '@/lib/errors/log-db-error'
import { supabaseAdmin } from '@/lib/supabase'
import type { ApAktionsErgebnis } from '@/teo/arbeitsplatz/aktionen/vorgang'
import { ANLAGE_ARTEN, type AnlageFelder } from '@/teo/arbeitsplatz/anlagen'
import { ladeApKontext } from '@/teo/arbeitsplatz/kontext'
import { darf, siehtObjekt } from '@/teo/arbeitsplatz/rechte'

export async function anlageSpeichern(objektId: string, id: string | null, f: AnlageFelder): Promise<ApAktionsErgebnis> {
  const k = await ladeApKontext()
  if (!k) return { ok: false, fehler: 'Bitte melden Sie sich erneut an.' }
  if (!darf(k.person, 'objekte.bearbeiten') || !siehtObjekt(k.person, objektId)) return { ok: false, fehler: 'Dafür fehlt Ihnen die Berechtigung.' }
  const name = f.name.trim().slice(0, 120)
  if (!name) return { ok: false, fehler: 'Bitte einen Namen eingeben.' }
  const bj = f.baujahr.trim() ? Number(f.baujahr) : null
  if (bj != null && (!Number.isInteger(bj) || bj < 1800 || bj > 2200)) return { ok: false, fehler: 'Bitte ein gültiges Baujahr eingeben.' }
  const { data: obj } = await supabaseAdmin.from('kunden_objekte').select('id').eq('id', objektId).eq('kunde_id', k.org.id).maybeSingle()
  if (!obj) return { ok: false, fehler: 'Objekt nicht gefunden.' }

  const werte = {
    name,
    art: ANLAGE_ARTEN.includes(f.art) ? f.art : 'sonstiges',
    baujahr: bj,
    notiz: f.notiz.trim().slice(0, 2000) || null,
    updated_at: new Date().toISOString(),
  }
  const { error } = id
    ? await supabaseAdmin.from('teo_anlagen').update(werte).eq('id', id).eq('kunde_id', k.org.id).eq('kunde_objekt_id', objektId)
    : await supabaseAdmin.from('teo_anlagen').insert({ ...werte, kunde_id: k.org.id, kunde_objekt_id: objektId })
  if (error) {
    logDbError('teo/arbeitsplatz/aktionen/anlagen:speichern', error)
    return { ok: false, fehler: 'Anlage konnte nicht gespeichert werden.' }
  }
  revalidatePath(`/arbeitsplatz/objekte/${objektId}`)
  return { ok: true }
}

export async function anlageEntfernen(objektId: string, id: string): Promise<ApAktionsErgebnis> {
  const k = await ladeApKontext()
  if (!k) return { ok: false, fehler: 'Bitte melden Sie sich erneut an.' }
  if (!darf(k.person, 'objekte.bearbeiten') || !siehtObjekt(k.person, objektId)) return { ok: false, fehler: 'Dafür fehlt Ihnen die Berechtigung.' }
  const { error } = await supabaseAdmin.from('teo_anlagen').update({ aktiv: false }).eq('id', id).eq('kunde_id', k.org.id)
  if (error) {
    logDbError('teo/arbeitsplatz/aktionen/anlagen:entfernen', error)
    return { ok: false, fehler: 'Anlage konnte nicht entfernt werden.' }
  }
  await supabaseAdmin.from('teo_plaene').update({ anlage_id: null }).eq('anlage_id', id).eq('kunde_id', k.org.id)
  revalidatePath(`/arbeitsplatz/objekte/${objektId}`)
  return { ok: true }
}
