import 'server-only'

import { cache } from 'react'

import { logDbError } from '@/lib/errors/log-db-error'
import { supabaseAdmin } from '@/lib/supabase'
import { createClient } from '@/lib/supabase/server'
import type { ApPerson, ApRolle } from '@/teo/arbeitsplatz/rechte'

export type ApOrg = { id: string; name: string; orgTyp: 'hv' | 'weg' | null }

export type ApKontext = { userId: string; org: ApOrg; person: ApPerson }

type MitgliedZeile = {
  id: string
  kunde_id: string
  rolle: string
  ist_admin: boolean | null
  darf_freigeben: boolean | null
  name: string | null
  email: string | null
}

const ROLLEN: ApRolle[] = ['verwaltung', 'team', 'eigentuemer']

/** E-Mail als exaktes ilike-Muster (_ und % sind sonst Platzhalter). */
function exakt(email: string): string {
  return email.replace(/[\\%_]/g, (z) => `\\${z}`)
}

async function orgLaden(kundeId: string): Promise<ApOrg | null> {
  const { data, error } = await supabaseAdmin
    .from('kunden')
    .select('id, name, org_anzeigename, org_typ, portal_modus')
    .eq('id', kundeId)
    .maybeSingle()
  if (error) logDbError('teo/arbeitsplatz/kontext:kunden', error)
  if (!data || data.portal_modus !== 'organisation') return null
  const typ = data.org_typ === 'weg' ? 'weg' : data.org_typ === 'hv' ? 'hv' : null
  return { id: String(data.id), name: String(data.org_anzeigename || data.name || 'Verwaltung'), orgTyp: typ }
}

async function objekteDerPerson(mitgliedId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from('mitglied_objekte')
    .select('kunde_objekt_id')
    .eq('mitglied_id', mitgliedId)
  if (error) logDbError('teo/arbeitsplatz/kontext:mitglied_objekte', error)
  return (data ?? []).map((r) => String(r.kunde_objekt_id))
}

/** Offene Einladung zur E-Mail beim ersten Login übernehmen. */
async function einladungUebernehmen(userId: string, email: string): Promise<MitgliedZeile | null> {
  const { data, error } = await supabaseAdmin
    .from('kunden_mitglieder')
    .update({ auth_user_id: userId })
    .is('auth_user_id', null)
    .ilike('email', exakt(email))
    .eq('aktiv', true)
    .select('id, kunde_id, rolle, ist_admin, darf_freigeben, name, email')
  if (error) logDbError('teo/arbeitsplatz/kontext:einladung', error)
  return (data?.[0] as MitgliedZeile | undefined) ?? null
}

/**
 * Wer ist eingeloggt, zu welcher Organisation gehört er, was darf er?
 * Reihenfolge: Mitgliedschaft → offene Einladung → Hauptkonto der Organisation.
 * null = kein Zugang zum Arbeitsplatz-Bereich.
 */
export const ladeApKontext = cache(async (): Promise<ApKontext | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return null
  const email = user.email.trim().toLowerCase()

  const { data: zeilen, error } = await supabaseAdmin
    .from('kunden_mitglieder')
    .select('id, kunde_id, rolle, ist_admin, darf_freigeben, name, email')
    .eq('auth_user_id', user.id)
    .eq('aktiv', true)
    .order('created_at', { ascending: true })
    .limit(1)
  if (error) logDbError('teo/arbeitsplatz/kontext:kunden_mitglieder', error)
  const mitglied = (zeilen?.[0] as MitgliedZeile | undefined) ?? (await einladungUebernehmen(user.id, email))

  if (mitglied && ROLLEN.includes(mitglied.rolle as ApRolle)) {
    const org = await orgLaden(String(mitglied.kunde_id))
    if (!org) return null
    const rolle = mitglied.rolle as ApRolle
    return {
      userId: user.id,
      org,
      person: {
        mitgliedId: String(mitglied.id),
        rolle,
        istAdmin: rolle === 'verwaltung' && Boolean(mitglied.ist_admin),
        darfFreigeben: rolle === 'verwaltung' && Boolean(mitglied.darf_freigeben),
        objektIds: rolle === 'verwaltung' ? null : await objekteDerPerson(String(mitglied.id)),
        name: mitglied.name?.trim() || email,
        email,
      },
    }
  }

  // Hauptkonto: Organisation mit diesem Login, sonst mit dieser E-Mail
  const hauptkonto = async (feld: 'auth_user_id' | 'email') => {
    const q = supabaseAdmin.from('kunden').select('id, name').eq('portal_modus', 'organisation')
    const { data, error: hErr } = await (feld === 'auth_user_id' ? q.eq('auth_user_id', user.id) : q.ilike('email', exakt(email)))
      .order('created_at', { ascending: true })
      .limit(1)
    if (hErr) logDbError('teo/arbeitsplatz/kontext:hauptkonto', hErr)
    return data?.[0] ?? null
  }
  const kunde = (await hauptkonto('auth_user_id')) ?? (await hauptkonto('email'))
  if (!kunde) return null
  const org = await orgLaden(String(kunde.id))
  if (!org) return null
  const meta = user.user_metadata as { name?: string } | undefined
  return {
    userId: user.id,
    org,
    person: {
      mitgliedId: null,
      rolle: 'verwaltung',
      istAdmin: true,
      darfFreigeben: true,
      objektIds: null,
      name: meta?.name?.trim() || String(kunde.name ?? email),
      email,
    },
  }
})
