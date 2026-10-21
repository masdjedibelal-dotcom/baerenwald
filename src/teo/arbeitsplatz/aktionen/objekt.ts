'use server'

import { revalidatePath } from 'next/cache'

import { logDbError } from '@/lib/errors/log-db-error'
import { allocateMeldeSlug } from '@/lib/org/ensure-melde-slug'
import { isValidMeldeSlug, suggestMeldeSlugFromAddress } from '@/lib/org/slug'
import { supabaseAdmin } from '@/lib/supabase'
import type { ApAktionsErgebnis } from '@/teo/arbeitsplatz/aktionen/vorgang'
import { ladeApKontext, type ApKontext } from '@/teo/arbeitsplatz/kontext'
import { KONTAKT_ROLLEN } from '@/teo/arbeitsplatz/objekt-felder'
import { darf, siehtObjekt } from '@/teo/arbeitsplatz/rechte'

async function verwaltung(): Promise<{ ok: true; k: ApKontext } | { ok: false; fehler: string }> {
  const k = await ladeApKontext()
  if (!k) return { ok: false, fehler: 'Bitte melden Sie sich erneut an.' }
  if (!darf(k.person, 'objekte.bearbeiten')) return { ok: false, fehler: 'Dafür fehlt Ihnen die Berechtigung.' }
  return { ok: true, k }
}

async function objektDerOrg(k: ApKontext, id: string): Promise<boolean> {
  if (!siehtObjekt(k.person, id)) return false
  const { data } = await supabaseAdmin.from('kunden_objekte').select('id').eq('id', id).eq('kunde_id', k.org.id).maybeSingle()
  return Boolean(data)
}

function text(v: unknown, max = 200): string | null {
  const s = String(v ?? '').trim().slice(0, max)
  return s || null
}

function betrag(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(String(v).replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null
}

export type ObjektFelder = {
  titel: string
  strasse?: string
  hausnummer?: string
  plz?: string
  ort?: string
  freigabeSchwelle?: string | number | null
  budget?: string | number | null
  zustaendigId?: string | null
}

export async function objektSpeichern(id: string | null, f: ObjektFelder): Promise<ApAktionsErgebnis & { id?: string }> {
  const p = await verwaltung()
  if (!p.ok) return p
  const titel = text(f.titel, 120)
  if (!titel) return { ok: false, fehler: 'Bitte einen Namen eingeben.' }

  let zustaendig: string | null = f.zustaendigId?.trim() || null
  if (zustaendig) {
    const { data } = await supabaseAdmin
      .from('kunden_mitglieder')
      .select('id')
      .eq('id', zustaendig)
      .eq('kunde_id', p.k.org.id)
      .eq('rolle', 'verwaltung')
      .maybeSingle()
    if (!data) zustaendig = null
  }

  const felder = {
    titel,
    strasse: text(f.strasse),
    hausnummer: text(f.hausnummer, 20),
    plz: text(f.plz, 10),
    ort: text(f.ort),
    freigabe_schwelle_eur: betrag(f.freigabeSchwelle),
    budget_jahr: betrag(f.budget),
    zustaendig_mitglied_id: zustaendig,
  }

  if (id) {
    if (!(await objektDerOrg(p.k, id))) return { ok: false, fehler: 'Objekt nicht gefunden.' }
    const { error } = await supabaseAdmin.from('kunden_objekte').update(felder).eq('id', id).eq('kunde_id', p.k.org.id)
    if (error) {
      logDbError('teo/arbeitsplatz/aktionen/objekt:update', error)
      return { ok: false, fehler: 'Objekt konnte nicht gespeichert werden.' }
    }
    revalidatePath('/arbeitsplatz', 'layout')
    return { ok: true, id }
  }

  const basis = suggestMeldeSlugFromAddress(felder.strasse, felder.hausnummer, felder.plz) || suggestMeldeSlugFromAddress(titel, null, null)
  const melde_slug = await allocateMeldeSlug(p.k.org.id, basis)
  if (!isValidMeldeSlug(melde_slug)) return { ok: false, fehler: 'Melde-Link konnte nicht erzeugt werden.' }
  const { data, error } = await supabaseAdmin
    .from('kunden_objekte')
    .insert({ ...felder, kunde_id: p.k.org.id, melde_slug, melde_aktiv: true, created_by: 'arbeitsplatz' })
    .select('id')
    .single()
  if (error || !data) {
    logDbError('teo/arbeitsplatz/aktionen/objekt:insert', error)
    return { ok: false, fehler: 'Objekt konnte nicht angelegt werden.' }
  }
  revalidatePath('/arbeitsplatz', 'layout')
  return { ok: true, id: String(data.id) }
}

export type KontaktFelder = { rolle: string; name: string; telefon?: string; email?: string; notiz?: string }

export async function kontaktSpeichern(objektId: string, kontaktId: string | null, f: KontaktFelder): Promise<ApAktionsErgebnis> {
  const p = await verwaltung()
  if (!p.ok) return p
  if (!(await objektDerOrg(p.k, objektId))) return { ok: false, fehler: 'Objekt nicht gefunden.' }
  const name = text(f.name, 120)
  if (!name) return { ok: false, fehler: 'Bitte einen Namen eingeben.' }
  const rolle = (KONTAKT_ROLLEN as readonly string[]).includes(f.rolle) ? f.rolle : 'sonstiges'
  const felder = { rolle, name, telefon: text(f.telefon, 40), email: text(f.email, 120), notiz: text(f.notiz, 500) }
  const q = kontaktId
    ? supabaseAdmin.from('objekt_kontakte').update(felder).eq('id', kontaktId).eq('kunde_objekt_id', objektId)
    : supabaseAdmin.from('objekt_kontakte').insert({ ...felder, kunde_id: p.k.org.id, kunde_objekt_id: objektId })
  const { error } = await q
  if (error) {
    logDbError('teo/arbeitsplatz/aktionen/objekt:kontakt', error)
    return { ok: false, fehler: 'Kontakt konnte nicht gespeichert werden.' }
  }
  revalidatePath(`/arbeitsplatz/objekte/${objektId}`)
  return { ok: true }
}

export async function kontaktEntfernen(objektId: string, kontaktId: string): Promise<ApAktionsErgebnis> {
  const p = await verwaltung()
  if (!p.ok) return p
  if (!(await objektDerOrg(p.k, objektId))) return { ok: false, fehler: 'Objekt nicht gefunden.' }
  const { error } = await supabaseAdmin
    .from('objekt_kontakte')
    .update({ aktiv: false })
    .eq('id', kontaktId)
    .eq('kunde_objekt_id', objektId)
  if (error) {
    logDbError('teo/arbeitsplatz/aktionen/objekt:kontakt-entfernen', error)
    return { ok: false, fehler: 'Kontakt konnte nicht entfernt werden.' }
  }
  revalidatePath(`/arbeitsplatz/objekte/${objektId}`)
  return { ok: true }
}
