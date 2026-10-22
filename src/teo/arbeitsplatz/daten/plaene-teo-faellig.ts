import 'server-only'

import { logDbError } from '@/lib/errors/log-db-error'
import { supabaseAdmin } from '@/lib/supabase'
import { legeVorgangAn } from '@/teo/arbeitsplatz/daten/vorgang-anlegen'
import type { ApKontext } from '@/teo/arbeitsplatz/kontext'
import { heute, naechsteFaelligkeit, PLAN_ART_LABEL, type IntervallEinheit, type PlanArt } from '@/teo/arbeitsplatz/plaene/plan-logik'

/** So viele Tage vor Fälligkeit geht der Auftrag an TEO (Zeit für Angebot + Termin). */
export const TEO_VORLAUF_TAGE = 21

type Ergebnis = { geprueft: number; angelegt: number; fehler: number }

/**
 * Pläne „TEO erledigt“: kurz vor Fälligkeit automatisch als Vorgang an TEO.
 * Nachweis mit Vorgang anlegen, nächste Fälligkeit setzen (läuft täglich per CRM-Cron).
 */
export async function verarbeiteTeoPlaene(): Promise<Ergebnis> {
  const bis = naechsteFaelligkeit(heute(), 'tag', TEO_VORLAUF_TAGE)
  const { data, error } = await supabaseAdmin
    .from('teo_plaene')
    .select('id, kunde_id, kunde_objekt_id, anlage_id, titel, art, intervall_einheit, intervall_anzahl, naechste_faelligkeit')
    .eq('aktiv', true)
    .eq('zustaendig', 'teo')
    .lte('naechste_faelligkeit', bis)
    .limit(200)
  if (error) {
    logDbError('teo/arbeitsplatz/plaene-teo-faellig:liste', error)
    return { geprueft: 0, angelegt: 0, fehler: 1 }
  }
  const plaene = data ?? []
  const erg: Ergebnis = { geprueft: plaene.length, angelegt: 0, fehler: 0 }
  if (!plaene.length) return erg

  const orgIds = [...new Set(plaene.map((p) => String(p.kunde_id)))]
  const anlageIds = [...new Set(plaene.map((p) => p.anlage_id).filter(Boolean).map(String))]
  const [orgRes, anlRes] = await Promise.all([
    supabaseAdmin.from('kunden').select('id, name, org_anzeigename, org_typ, email, auth_user_id').in('id', orgIds),
    anlageIds.length ? supabaseAdmin.from('teo_anlagen').select('id, name, baujahr').in('id', anlageIds) : Promise.resolve({ data: [], error: null }),
  ])
  if (orgRes.error) logDbError('teo/arbeitsplatz/plaene-teo-faellig:org', orgRes.error)
  const orgVon = new Map((orgRes.data ?? []).map((o) => [String(o.id), o]))
  const anlageVon = new Map((anlRes.data ?? []).map((a) => [String(a.id), a]))

  for (const p of plaene) {
    const org = orgVon.get(String(p.kunde_id))
    if (!org?.email) {
      erg.fehler++
      continue
    }
    const name = String(org.org_anzeigename || org.name || 'Verwaltung')
    // Als Hauptkonto der Verwaltung → geht direkt an TEO
    const k: ApKontext = {
      userId: String(org.auth_user_id ?? ''),
      org: { id: String(org.id), name, orgTyp: org.org_typ === 'weg' ? 'weg' : org.org_typ === 'hv' ? 'hv' : null },
      person: { mitgliedId: null, rolle: 'verwaltung', istAdmin: true, darfFreigeben: true, objektIds: null, name, email: String(org.email) },
    }
    const anlage = p.anlage_id ? anlageVon.get(String(p.anlage_id)) : null
    const faellig = String(p.naechste_faelligkeit)
    const r = await legeVorgangAn(k, {
      objektId: String(p.kunde_objekt_id),
      beschreibung: [
        `${p.titel} (${PLAN_ART_LABEL[p.art as PlanArt] ?? 'Plan'}) fällig am ${faellig.split('-').reverse().join('.')}.`,
        anlage ? `Anlage: ${anlage.name}${anlage.baujahr ? `, Baujahr ${anlage.baujahr}` : ''}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
      dringend: false,
    })
    if (!r.ok) {
      console.warn('[teo-plaene] Vorgang:', p.id, r.fehler)
      erg.fehler++
      continue
    }
    const { error: eErr } = await supabaseAdmin.from('teo_plan_erledigungen').insert({
      plan_id: p.id,
      faellig_am: faellig,
      erledigt_name: 'An TEO beauftragt',
      punkte: [],
      fotos: [],
      vorgang_id: r.id,
    })
    if (eErr) logDbError('teo/arbeitsplatz/plaene-teo-faellig:nachweis', eErr)
    const basis = faellig >= heute() ? faellig : heute()
    const { error: nErr } = await supabaseAdmin
      .from('teo_plaene')
      .update({ naechste_faelligkeit: naechsteFaelligkeit(basis, p.intervall_einheit as IntervallEinheit, Number(p.intervall_anzahl) || 1), updated_at: new Date().toISOString() })
      .eq('id', p.id)
    if (nErr) logDbError('teo/arbeitsplatz/plaene-teo-faellig:naechste', nErr)
    erg.angelegt++
  }
  return erg
}
