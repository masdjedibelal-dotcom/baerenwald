import 'server-only'

import { logDbError } from '@/lib/errors/log-db-error'
import { loadPortalAuftraegeByLeadIds } from '@/lib/portal/load-auftraege-by-lead-ids'
import { supabaseAdmin } from '@/lib/supabase'
import { mieterStatusLabel, resolveMieterStatusStufe, type MieterStatusStufe } from '@/lib/vorgang/vorgang-phase'
import { ladeObjekt, objektName } from '@/teo/arbeitsplatz/daten/objekte'
import type { ApKontext } from '@/teo/arbeitsplatz/kontext'
import type { ApStatus } from '@/teo/arbeitsplatz/vorgang-status'

export type MeineMeldung = {
  id: string
  titel: string
  objektName: string
  datum: string
  stufe: MieterStatusStufe
  stufeLabel: string
  statusLink: string | null
}

export type MeinPlan = { id: string; titel: string; zuletzt: string | null; naechste: string }

export type MeinObjekt = {
  id: string
  name: string
  adresse: string
  meldeLink: string | null
  vorgaenge: Array<{ id: string; titel: string; datum: string; status: string; erledigt: boolean }>
  /** nur WEG */
  kosten: { jahr: number; beauftragt: number; budget: number | null } | null
}

const EIGENTUEMER_STATUS: Record<ApStatus, string> = {
  neu: 'Eingegangen',
  beim_team: 'In Bearbeitung',
  zu_entscheiden: 'In Bearbeitung',
  bei_teo: 'In Bearbeitung',
  termin: 'Termin geplant',
  beauftragt: 'Beauftragt',
  erledigt: 'Erledigt',
  abgelehnt: 'Abgelehnt',
}

function exakt(email: string): string {
  return email.replace(/[\\%_]/g, (z) => `\\${z}`)
}

function titelAus(text: unknown): string {
  const t = String(text ?? '').trim().split('\n')[0] ?? ''
  return t.length > 80 ? `${t.slice(0, 77)}…` : t || 'Meldung'
}

/** Meldungen, die diese E-Mail bei einer Verwaltung abgegeben hat (Melde-Link oder Konto). */
export async function ladeMeineMeldungen(
  email: string
): Promise<{ meldungen: MeineMeldung[]; orgId: string | null; objektIds: string[]; meldeLink: string | null }> {
  const { data, error } = await supabaseAdmin
    .from('leads')
    .select(
      'id, created_at, kontakt_nachricht, melde_tracking_token, kunde_objekt_id, auftraggeber_kunde_id, status, hv_meldung_status, vorgang_phase, org_freigabe_status, mieter_vor_ort_at, storniert_am'
    )
    .ilike('melder_email', exakt(email.trim()))
    .not('auftraggeber_kunde_id', 'is', null)
    .is('geloescht_am', null)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) logDbError('teo/mein/mein-daten:meldungen', error)
  const rows = data ?? []
  if (!rows.length) return { meldungen: [], orgId: null, objektIds: [], meldeLink: null }

  const objektIds = [...new Set(rows.map((r) => r.kunde_objekt_id).filter(Boolean).map(String))]
  const orgId = String(rows[0].auftraggeber_kunde_id)
  const [{ kontextByLeadId }, objRes, orgRes] = await Promise.all([
    loadPortalAuftraegeByLeadIds(rows.map((r) => String(r.id))),
    objektIds.length
      ? supabaseAdmin.from('kunden_objekte').select('id, titel, strasse, hausnummer, melde_slug, melde_aktiv').in('id', objektIds)
      : Promise.resolve({ data: [], error: null }),
    supabaseAdmin.from('kunden').select('org_kennung').eq('id', orgId).maybeSingle(),
  ])
  const objVon = new Map((objRes.data ?? []).map((o) => [String(o.id), objektName(o as Parameters<typeof objektName>[0])]))

  // Neue Meldung: Objekt der letzten Meldung
  const kennung = (orgRes.data as { org_kennung?: string | null } | null)?.org_kennung?.trim()
  const letztes = (objRes.data ?? []).find((o) => String(o.id) === String(rows.find((r) => r.kunde_objekt_id)?.kunde_objekt_id))
  const meldeLink = kennung && letztes?.melde_slug && letztes.melde_aktiv !== false ? `/melden/${kennung}/${letztes.melde_slug}` : kennung ? `/melden/${kennung}` : null

  return {
    orgId,
    objektIds,
    meldeLink,
    meldungen: rows.map((r) => {
      const stufe = resolveMieterStatusStufe(r, kontextByLeadId[String(r.id)] ?? null)
      return {
        id: String(r.id),
        titel: titelAus(r.kontakt_nachricht),
        objektName: r.kunde_objekt_id ? objVon.get(String(r.kunde_objekt_id)) ?? '' : '',
        datum: String(r.created_at),
        stufe,
        stufeLabel: mieterStatusLabel(stufe),
        statusLink: r.melde_tracking_token ? `/melden/status/${r.melde_tracking_token}` : null,
      }
    }),
  }
}

/** Für Mieter sichtbare Pläne (z. B. Treppenhaus) mit letzter Erledigung. */
export async function ladeHausPlaene(objektIds: string[]): Promise<Map<string, MeinPlan[]>> {
  const aus = new Map<string, MeinPlan[]>()
  if (!objektIds.length) return aus
  const { data, error } = await supabaseAdmin
    .from('teo_plaene')
    .select('id, titel, kunde_objekt_id, naechste_faelligkeit')
    .in('kunde_objekt_id', objektIds)
    .eq('aktiv', true)
    .eq('fuer_mieter_sichtbar', true)
    .order('titel')
  if (error) logDbError('teo/mein/mein-daten:plaene', error)
  const plaene = data ?? []
  if (!plaene.length) return aus
  const { data: erl, error: eErr } = await supabaseAdmin
    .from('teo_plan_erledigungen')
    .select('plan_id, erledigt_am')
    .in('plan_id', plaene.map((p) => String(p.id)))
    .order('erledigt_am', { ascending: false })
    .limit(500)
  if (eErr) logDbError('teo/mein/mein-daten:erledigungen', eErr)
  const zuletzt = new Map<string, string>()
  for (const e of erl ?? []) if (!zuletzt.has(String(e.plan_id))) zuletzt.set(String(e.plan_id), String(e.erledigt_am))
  for (const p of plaene) {
    const l = aus.get(String(p.kunde_objekt_id)) ?? []
    l.push({ id: String(p.id), titel: String(p.titel), zuletzt: zuletzt.get(String(p.id)) ?? null, naechste: String(p.naechste_faelligkeit) })
    aus.set(String(p.kunde_objekt_id), l)
  }
  return aus
}

/** Eigentümer: zugeordnete Objekte mit Kosten und Budget (WEG und Mietobjekt — Eigentümer tragen die Kosten). */
export async function ladeEigentuemerObjekte(k: ApKontext): Promise<MeinObjekt[]> {
  const ids = k.person.objektIds ?? []
  if (!ids.length) return []
  // Beträge mitladen — Sichtbarkeit bleibt auf die zugeordneten Objekte begrenzt (objektIds)
  const ladeK: ApKontext = { ...k, person: { ...k.person, rolle: 'verwaltung' } }
  const details = await Promise.all(ids.map((id) => ladeObjekt(ladeK, id)))
  return details
    .filter((d): d is NonNullable<typeof d> => Boolean(d))
    .map((d) => ({
      id: d.objekt.id,
      name: d.objekt.name,
      adresse: d.objekt.adresse,
      meldeLink: d.objekt.meldeAktiv ? d.objekt.meldeLink : null,
      vorgaenge: d.vorgaenge
        .filter((v) => v.status !== 'abgelehnt')
        .slice(0, 20)
        .map((v) => ({ id: v.id, titel: v.titel, datum: v.erstellt, status: EIGENTUEMER_STATUS[v.status], erledigt: v.status === 'erledigt' })),
      kosten: { jahr: d.jahr, beauftragt: d.beauftragt, budget: d.objekt.budget },
    }))
}

/** TEO: Konto nur mit Meldungen bei einer Verwaltung (kein eigener Auftrag) → MeinTEO statt Privat-Portal. */
export async function nurMeldungenBeiVerwaltung(userId: string, email: string): Promise<boolean> {
  const { count: meldungen, error } = await supabaseAdmin
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .ilike('melder_email', exakt(email.trim()))
    .not('auftraggeber_kunde_id', 'is', null)
    .is('geloescht_am', null)
  if (error) logDbError('teo/mein/mein-daten:nur-meldungen', error)
  if (!meldungen) return false
  const { data: eigene } = await supabaseAdmin.from('kunden').select('id').eq('auth_user_id', userId)
  const ids = (eigene ?? []).map((k) => String(k.id))
  if (!ids.length) return true
  const { count: eigeneLeads } = await supabaseAdmin
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .in('kunde_id', ids)
    .is('auftraggeber_kunde_id', null)
    .is('geloescht_am', null)
  return !eigeneLeads
}
