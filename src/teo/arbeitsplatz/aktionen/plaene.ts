'use server'

import { revalidatePath } from 'next/cache'

import { logDbError } from '@/lib/errors/log-db-error'
import { supabaseAdmin } from '@/lib/supabase'
import type { ApAktionsErgebnis } from '@/teo/arbeitsplatz/aktionen/vorgang'
import { ladePlaene } from '@/teo/arbeitsplatz/daten/plaene'
import { legeVorgangAn } from '@/teo/arbeitsplatz/daten/vorgang-anlegen'
import { ladeApKontext, type ApKontext } from '@/teo/arbeitsplatz/kontext'
import {
  heute,
  naechsteFaelligkeit,
  punkteAus,
  type IntervallEinheit,
  type PlanArt,
  type PlanZustaendig,
} from '@/teo/arbeitsplatz/plaene/plan-logik'
import { darf, siehtObjekt, type ApAktion } from '@/teo/arbeitsplatz/rechte'

const ARTEN: PlanArt[] = ['reinigung', 'kontrolle', 'wartung', 'pruefung', 'winterdienst', 'garten', 'sonstiges']
const EINHEITEN: IntervallEinheit[] = ['tag', 'woche', 'monat', 'jahr']

async function pruefen(aktion: ApAktion): Promise<{ ok: true; k: ApKontext } | { ok: false; fehler: string }> {
  const k = await ladeApKontext()
  if (!k) return { ok: false, fehler: 'Bitte melden Sie sich erneut an.' }
  if (!darf(k.person, aktion)) return { ok: false, fehler: 'Dafür fehlt Ihnen die Berechtigung.' }
  return { ok: true, k }
}

function neuLaden() {
  revalidatePath('/arbeitsplatz', 'layout')
  revalidatePath('/team', 'layout')
}

export type PlanFelder = {
  titel: string
  art: PlanArt
  objektId: string
  anlageId?: string | null
  einheit: IntervallEinheit
  anzahl: number
  naechste: string
  zustaendig: PlanZustaendig
  zustaendigId?: string | null
  punkte: string[]
  mieter: boolean
}

export async function planSpeichern(id: string | null, f: PlanFelder): Promise<ApAktionsErgebnis & { id?: string }> {
  const p = await pruefen('plaene.verwalten')
  if (!p.ok) return p
  const titel = f.titel.trim().slice(0, 120)
  if (!titel) return { ok: false, fehler: 'Bitte einen Namen eingeben.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.naechste)) return { ok: false, fehler: 'Bitte ein Datum für die nächste Fälligkeit wählen.' }
  if (!siehtObjekt(p.k.person, f.objektId)) return { ok: false, fehler: 'Objekt nicht gefunden.' }
  const { data: obj } = await supabaseAdmin.from('kunden_objekte').select('id').eq('id', f.objektId).eq('kunde_id', p.k.org.id).maybeSingle()
  if (!obj) return { ok: false, fehler: 'Objekt nicht gefunden.' }
  let anlageId: string | null = null
  if (f.anlageId) {
    const { data: an } = await supabaseAdmin.from('teo_anlagen').select('id').eq('id', f.anlageId).eq('kunde_objekt_id', f.objektId).maybeSingle()
    anlageId = an ? String(an.id) : null
  }

  const werte = {
    titel,
    art: ARTEN.includes(f.art) ? f.art : 'sonstiges',
    kunde_objekt_id: f.objektId,
    anlage_id: anlageId,
    intervall_einheit: EINHEITEN.includes(f.einheit) ? f.einheit : 'woche',
    intervall_anzahl: Math.min(120, Math.max(1, Math.round(Number(f.anzahl) || 1))),
    naechste_faelligkeit: f.naechste,
    zustaendig: f.zustaendig === 'teo' ? 'teo' : 'team',
    zustaendig_mitglied_id: f.zustaendig === 'team' ? f.zustaendigId || null : null,
    checkliste: punkteAus(f.punkte),
    fuer_mieter_sichtbar: Boolean(f.mieter),
    updated_at: new Date().toISOString(),
  }
  const { data, error } = id
    ? await supabaseAdmin.from('teo_plaene').update(werte).eq('id', id).eq('kunde_id', p.k.org.id).select('id').single()
    : await supabaseAdmin.from('teo_plaene').insert({ ...werte, kunde_id: p.k.org.id }).select('id').single()
  if (error || !data) {
    logDbError('teo/arbeitsplatz/aktionen/plaene:speichern', error)
    return { ok: false, fehler: 'Plan konnte nicht gespeichert werden.' }
  }
  neuLaden()
  return { ok: true, id: String(data.id) }
}

export async function planEntfernen(id: string): Promise<ApAktionsErgebnis> {
  const p = await pruefen('plaene.verwalten')
  if (!p.ok) return p
  const { error } = await supabaseAdmin.from('teo_plaene').update({ aktiv: false }).eq('id', id).eq('kunde_id', p.k.org.id)
  if (error) {
    logDbError('teo/arbeitsplatz/aktionen/plaene:entfernen', error)
    return { ok: false, fehler: 'Plan konnte nicht entfernt werden.' }
  }
  neuLaden()
  return { ok: true }
}

export type Abhaken = { punkte: Array<{ id: string; ok: boolean }>; notiz?: string; fotos?: string[] }

/**
 * Plan erledigt: Nachweis speichern, nächste Fälligkeit setzen.
 * Ist ein Punkt nicht in Ordnung, entsteht ein Vorgang (Team → „Neu“ bei der Verwaltung).
 */
export async function planAbhaken(planId: string, a: Abhaken): Promise<ApAktionsErgebnis & { vorgangId?: string }> {
  const p = await pruefen('plaene.abhaken')
  if (!p.ok) return p
  const [plan] = await ladePlaene(p.k, { planId })
  if (!plan) return { ok: false, fehler: 'Plan nicht gefunden.' }
  if (plan.zustaendig === 'teo') return { ok: false, fehler: 'Diesen Plan erledigt TEO.' }

  const okVon = new Map(a.punkte.map((x) => [x.id, x.ok]))
  const punkte = plan.checkliste.map((c) => ({ ...c, ok: okVon.get(c.id) !== false }))
  const mangel = punkte.filter((x) => !x.ok)
  const notiz = a.notiz?.trim().slice(0, 2000) || null
  const fotos = (a.fotos ?? []).filter((u) => /^https?:\/\//.test(u)).slice(0, 8)

  let vorgangId: string | null = null
  if (mangel.length) {
    const r = await legeVorgangAn(p.k, {
      objektId: plan.objektId,
      beschreibung: [`${plan.titel}: nicht in Ordnung — ${mangel.map((m) => m.text).join(', ')}.`, notiz].filter(Boolean).join('\n'),
      dringend: false,
      fotos,
    })
    if (r.ok) vorgangId = r.id
    else console.warn('[plan-abhaken] Vorgang:', r.fehler)
  }

  const { error } = await supabaseAdmin.from('teo_plan_erledigungen').insert({
    plan_id: plan.id,
    faellig_am: plan.naechste,
    erledigt_von: p.k.userId,
    erledigt_name: p.k.person.name,
    punkte,
    fotos,
    notiz,
    vorgang_id: vorgangId,
  })
  if (error) {
    logDbError('teo/arbeitsplatz/aktionen/plaene:abhaken', error)
    return { ok: false, fehler: 'Nachweis konnte nicht gespeichert werden.' }
  }
  // Rhythmus halten; überfällig erledigt → ab heute weiterrechnen
  const basis = plan.naechste >= heute() ? plan.naechste : heute()
  const { error: nErr } = await supabaseAdmin
    .from('teo_plaene')
    .update({ naechste_faelligkeit: naechsteFaelligkeit(basis, plan.einheit, plan.anzahl), updated_at: new Date().toISOString() })
    .eq('id', plan.id)
  if (nErr) logDbError('teo/arbeitsplatz/aktionen/plaene:naechste', nErr)
  neuLaden()
  return { ok: true, vorgangId: vorgangId ?? undefined }
}
