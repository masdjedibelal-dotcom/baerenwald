import 'server-only'

import { logDbError } from '@/lib/errors/log-db-error'
import { supabaseAdmin } from '@/lib/supabase'
import { ladeVorgaenge, type ApVorgangZeile } from '@/teo/arbeitsplatz/daten/vorgaenge'
import type { ApKontext } from '@/teo/arbeitsplatz/kontext'
import { siehtObjekt } from '@/teo/arbeitsplatz/rechte'

export type ApObjektZeile = {
  id: string
  name: string
  adresse: string
  offen: number
  zustaendig: string | null
  budget: number | null
  beauftragt: number
}

export type ApKontakt = { id: string; rolle: string; name: string; telefon: string | null; email: string | null; notiz: string | null }
export type ApPersonKurz = { id: string; name: string; rolle: string }

export type ApObjekt = {
  id: string
  name: string
  strasse: string | null
  hausnummer: string | null
  plz: string | null
  ort: string | null
  adresse: string
  freigabeSchwelle: number | null
  budget: number | null
  zustaendigId: string | null
  meldeLink: string | null
  meldeAktiv: boolean
}

export type ApObjektDetail = {
  objekt: ApObjekt
  vorgaenge: ApVorgangZeile[]
  kontakte: ApKontakt[]
  /** Verwaltung — Auswahl „Zuständig“ */
  verwaltung: ApPersonKurz[]
  /** Team/Eigentümer mit Zugriff auf dieses Objekt */
  zugeordnet: ApPersonKurz[]
  jahr: number
  beauftragt: number
  abgerechnet: number
}

const OBJEKT_SPALTEN = 'id, titel, strasse, hausnummer, plz, ort, melde_slug, melde_aktiv, freigabe_schwelle_eur, budget_jahr, zustaendig_mitglied_id'

type ObjektRoh = {
  id: string
  titel: string | null
  strasse: string | null
  hausnummer: string | null
  plz: string | null
  ort: string | null
  melde_slug: string | null
  melde_aktiv: boolean | null
  freigabe_schwelle_eur: number | string | null
  budget_jahr: number | string | null
  zustaendig_mitglied_id: string | null
}

function zahl(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  return Number.isFinite(n) ? n : null
}

export function objektName(o: { titel?: string | null; strasse?: string | null; hausnummer?: string | null }): string {
  return o.titel?.trim() || [o.strasse, o.hausnummer].filter(Boolean).join(' ') || 'Objekt'
}

function adresse(o: ObjektRoh): string {
  return [[o.strasse, o.hausnummer].filter(Boolean).join(' '), [o.plz, o.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ')
}

/** Im laufenden Jahr beauftragt (brutto): Vorgänge mit Auftrag, angelegt in diesem Jahr. */
function beauftragtImJahr(vorgaenge: ApVorgangZeile[], jahr: number): number {
  return vorgaenge
    .filter((v) => (v.status === 'beauftragt' || v.status === 'erledigt' || v.status === 'termin') && new Date(v.erstellt).getFullYear() === jahr)
    .reduce((s, v) => s + (v.betrag ?? 0), 0)
}

async function mitgliederNamen(orgId: string): Promise<Map<string, { name: string; rolle: string }>> {
  const { data, error } = await supabaseAdmin
    .from('kunden_mitglieder')
    .select('id, name, email, rolle')
    .eq('kunde_id', orgId)
    .eq('aktiv', true)
  if (error) logDbError('teo/arbeitsplatz/daten/objekte:mitglieder', error)
  return new Map((data ?? []).map((m) => [String(m.id), { name: m.name?.trim() || String(m.email ?? ''), rolle: String(m.rolle) }]))
}

export async function ladeObjekte(k: ApKontext): Promise<ApObjektZeile[]> {
  const [objRes, vorgaenge, namen] = await Promise.all([
    supabaseAdmin.from('kunden_objekte').select(OBJEKT_SPALTEN).eq('kunde_id', k.org.id).order('titel'),
    ladeVorgaenge(k),
    mitgliederNamen(k.org.id),
  ])
  if (objRes.error) logDbError('teo/arbeitsplatz/daten/objekte:liste', objRes.error)
  const jahr = new Date().getFullYear()
  return ((objRes.data ?? []) as ObjektRoh[])
    .filter((o) => siehtObjekt(k.person, String(o.id)))
    .map((o) => {
      const vs = vorgaenge.filter((v) => v.objektId === String(o.id))
      return {
        id: String(o.id),
        name: objektName(o),
        adresse: adresse(o),
        offen: vs.filter((v) => v.status !== 'erledigt' && v.status !== 'abgelehnt').length,
        zustaendig: o.zustaendig_mitglied_id ? namen.get(String(o.zustaendig_mitglied_id))?.name ?? null : null,
        budget: zahl(o.budget_jahr),
        beauftragt: beauftragtImJahr(vs, jahr),
      }
    })
}

export async function ladeObjekt(k: ApKontext, id: string): Promise<ApObjektDetail | null> {
  if (!siehtObjekt(k.person, id)) return null
  const [objRes, orgRes, kontRes, zuordRes, vorgaenge, namen] = await Promise.all([
    supabaseAdmin.from('kunden_objekte').select(OBJEKT_SPALTEN).eq('id', id).eq('kunde_id', k.org.id).maybeSingle(),
    supabaseAdmin.from('kunden').select('org_kennung').eq('id', k.org.id).maybeSingle(),
    supabaseAdmin
      .from('objekt_kontakte')
      .select('id, rolle, name, telefon, email, notiz')
      .eq('kunde_objekt_id', id)
      .eq('aktiv', true)
      .order('sort_order'),
    supabaseAdmin.from('mitglied_objekte').select('mitglied_id').eq('kunde_objekt_id', id),
    ladeVorgaenge(k),
    mitgliederNamen(k.org.id),
  ])
  if (objRes.error) logDbError('teo/arbeitsplatz/daten/objekte:objekt', objRes.error)
  if (kontRes.error) logDbError('teo/arbeitsplatz/daten/objekte:kontakte', kontRes.error)
  if (zuordRes.error) logDbError('teo/arbeitsplatz/daten/objekte:zuordnung', zuordRes.error)
  const o = objRes.data as ObjektRoh | null
  if (!o) return null

  const kennung = (orgRes.data as { org_kennung?: string | null } | null)?.org_kennung?.trim()
  const vs = vorgaenge.filter((v) => v.objektId === id)
  const jahr = new Date().getFullYear()
  const zugeordnetIds = new Set((zuordRes.data ?? []).map((z) => String(z.mitglied_id)))

  return {
    objekt: {
      id,
      name: objektName(o),
      strasse: o.strasse,
      hausnummer: o.hausnummer,
      plz: o.plz,
      ort: o.ort,
      adresse: adresse(o),
      freigabeSchwelle: zahl(o.freigabe_schwelle_eur),
      budget: zahl(o.budget_jahr),
      zustaendigId: o.zustaendig_mitglied_id ? String(o.zustaendig_mitglied_id) : null,
      meldeLink: kennung && o.melde_slug ? `/melden/${kennung}/${o.melde_slug}` : null,
      meldeAktiv: o.melde_aktiv !== false,
    },
    vorgaenge: vs,
    kontakte: ((kontRes.data ?? []) as ApKontakt[]).map((c) => ({ ...c, id: String(c.id) })),
    verwaltung: [...namen.entries()].filter(([, m]) => m.rolle === 'verwaltung').map(([mid, m]) => ({ id: mid, name: m.name, rolle: m.rolle })),
    zugeordnet: [...namen.entries()].filter(([mid]) => zugeordnetIds.has(mid)).map(([mid, m]) => ({ id: mid, name: m.name, rolle: m.rolle })),
    jahr,
    beauftragt: beauftragtImJahr(vs, jahr),
    abgerechnet: vs.filter((v) => new Date(v.erstellt).getFullYear() === jahr).reduce((s, v) => s + (v.abgerechnet ?? 0), 0),
  }
}

/** Personen der Verwaltung (Auswahl „Zuständig“). */
export async function ladeVerwaltung(k: ApKontext): Promise<ApPersonKurz[]> {
  const namen = await mitgliederNamen(k.org.id)
  return [...namen.entries()].filter(([, m]) => m.rolle === 'verwaltung').map(([id, m]) => ({ id, name: m.name, rolle: m.rolle }))
}
