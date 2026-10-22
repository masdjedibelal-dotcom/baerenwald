import 'server-only'

import { logDbError } from '@/lib/errors/log-db-error'
import { supabaseAdmin } from '@/lib/supabase'
import { objektName } from '@/teo/arbeitsplatz/daten/objekte'
import type { ApKontext } from '@/teo/arbeitsplatz/kontext'
import type { ChecklistenPunkt, IntervallEinheit, PlanArt, PlanZustaendig } from '@/teo/arbeitsplatz/plaene/plan-logik'

export type ApPlan = {
  id: string
  titel: string
  art: PlanArt
  objektId: string
  objektName: string
  anlageId: string | null
  einheit: IntervallEinheit
  anzahl: number
  naechste: string
  zustaendig: PlanZustaendig
  zustaendigId: string | null
  zustaendigName: string | null
  checkliste: ChecklistenPunkt[]
  mieter: boolean
  letzte: string | null
}

export type ApErledigung = {
  id: string
  faelligAm: string
  erledigtAm: string
  wer: string
  punkte: Array<ChecklistenPunkt & { ok: boolean }>
  fotos: string[]
  notiz: string | null
  vorgangId: string | null
}

const SPALTEN =
  'id, titel, art, kunde_objekt_id, anlage_id, intervall_einheit, intervall_anzahl, naechste_faelligkeit, zustaendig, zustaendig_mitglied_id, checkliste, fuer_mieter_sichtbar'

type PlanRoh = {
  id: string
  titel: string
  art: PlanArt
  kunde_objekt_id: string
  anlage_id: string | null
  intervall_einheit: IntervallEinheit
  intervall_anzahl: number
  naechste_faelligkeit: string
  zustaendig: PlanZustaendig
  zustaendig_mitglied_id: string | null
  checkliste: unknown
  fuer_mieter_sichtbar: boolean
}

function checkliste(v: unknown): ChecklistenPunkt[] {
  return Array.isArray(v)
    ? v.filter((p) => p && typeof p === 'object').map((p, i) => ({ id: String((p as { id?: unknown }).id ?? `p${i + 1}`), text: String((p as { text?: unknown }).text ?? '') }))
    : []
}

/**
 * Pläne der Organisation, die die Person sieht (Objektfilter).
 * `nurEigene`: Team sieht nur Pläne, für die das Team zuständig ist.
 */
export async function ladePlaene(k: ApKontext, opts: { objektId?: string; planId?: string } = {}): Promise<ApPlan[]> {
  let q = supabaseAdmin.from('teo_plaene').select(SPALTEN).eq('kunde_id', k.org.id).eq('aktiv', true).order('naechste_faelligkeit')
  if (opts.objektId) q = q.eq('kunde_objekt_id', opts.objektId)
  if (opts.planId) q = q.eq('id', opts.planId)
  if (k.person.objektIds !== null) q = q.in('kunde_objekt_id', k.person.objektIds.length ? k.person.objektIds : ['00000000-0000-0000-0000-000000000000'])
  if (k.person.rolle === 'team') q = q.eq('zustaendig', 'team')
  const { data, error } = await q
  if (error) {
    logDbError('teo/arbeitsplatz/daten/plaene:liste', error)
    return []
  }
  const roh = (data ?? []) as PlanRoh[]
  if (!roh.length) return []
  const objektIds = [...new Set(roh.map((p) => p.kunde_objekt_id))]
  const planIds = roh.map((p) => p.id)
  const mitgliedIds = [...new Set(roh.map((p) => p.zustaendig_mitglied_id).filter(Boolean))] as string[]
  const [objRes, letzteRes, mRes] = await Promise.all([
    supabaseAdmin.from('kunden_objekte').select('id, titel, strasse, hausnummer').in('id', objektIds),
    supabaseAdmin.from('teo_plan_erledigungen').select('plan_id, erledigt_am').in('plan_id', planIds).order('erledigt_am', { ascending: false }),
    mitgliedIds.length ? supabaseAdmin.from('kunden_mitglieder').select('id, name, email').in('id', mitgliedIds) : Promise.resolve({ data: [], error: null }),
  ])
  if (objRes.error) logDbError('teo/arbeitsplatz/daten/plaene:objekte', objRes.error)
  if (letzteRes.error) logDbError('teo/arbeitsplatz/daten/plaene:letzte', letzteRes.error)
  const objName = new Map((objRes.data ?? []).map((o) => [String(o.id), objektName(o)]))
  const letzte = new Map<string, string>()
  for (const e of letzteRes.data ?? []) if (!letzte.has(String(e.plan_id))) letzte.set(String(e.plan_id), String(e.erledigt_am))
  const mName = new Map((mRes.data ?? []).map((m) => [String(m.id), (m.name as string | null)?.trim() || String(m.email ?? '')]))

  return roh.map((p) => ({
    id: String(p.id),
    titel: p.titel,
    art: p.art,
    objektId: String(p.kunde_objekt_id),
    objektName: objName.get(String(p.kunde_objekt_id)) ?? 'Objekt',
    anlageId: p.anlage_id ? String(p.anlage_id) : null,
    einheit: p.intervall_einheit,
    anzahl: p.intervall_anzahl,
    naechste: String(p.naechste_faelligkeit),
    zustaendig: p.zustaendig,
    zustaendigId: p.zustaendig_mitglied_id ? String(p.zustaendig_mitglied_id) : null,
    zustaendigName: p.zustaendig_mitglied_id ? mName.get(String(p.zustaendig_mitglied_id)) ?? null : null,
    checkliste: checkliste(p.checkliste),
    mieter: Boolean(p.fuer_mieter_sichtbar),
    letzte: letzte.get(String(p.id)) ?? null,
  }))
}

export async function ladeErledigungen(planId: string, limit = 30): Promise<ApErledigung[]> {
  const { data, error } = await supabaseAdmin
    .from('teo_plan_erledigungen')
    .select('id, faellig_am, erledigt_am, erledigt_name, punkte, fotos, notiz, vorgang_id')
    .eq('plan_id', planId)
    .order('erledigt_am', { ascending: false })
    .limit(limit)
  if (error) logDbError('teo/arbeitsplatz/daten/plaene:erledigungen', error)
  return (data ?? []).map((e) => ({
    id: String(e.id),
    faelligAm: String(e.faellig_am),
    erledigtAm: String(e.erledigt_am),
    wer: (e.erledigt_name as string | null)?.trim() || 'Team',
    punkte: Array.isArray(e.punkte) ? (e.punkte as Array<ChecklistenPunkt & { ok: boolean }>) : [],
    fotos: Array.isArray(e.fotos) ? (e.fotos as string[]) : [],
    notiz: (e.notiz as string | null) ?? null,
    vorgangId: e.vorgang_id ? String(e.vorgang_id) : null,
  }))
}
