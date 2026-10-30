import 'server-only'

import { logDbError } from '@/lib/errors/log-db-error'
import { supabaseAdmin } from '@/lib/supabase'
import type { ApKontext } from '@/teo/arbeitsplatz/kontext'
import type { ApRolle } from '@/teo/arbeitsplatz/rechte'

export type ApTeamPerson = {
  /** null = Hauptkonto der Organisation (nicht änderbar) */
  id: string | null
  name: string
  email: string
  rolle: ApRolle
  istAdmin: boolean
  darfFreigeben: boolean
  objektIds: string[]
  /** Einladung noch nicht angenommen */
  eingeladen: boolean
  istIch: boolean
}

export async function ladeTeam(k: ApKontext): Promise<ApTeamPerson[]> {
  const [orgRes, mRes] = await Promise.all([
    supabaseAdmin.from('kunden').select('name, email, auth_user_id').eq('id', k.org.id).maybeSingle(),
    supabaseAdmin
      .from('kunden_mitglieder')
      .select('id, name, email, rolle, ist_admin, darf_freigeben, auth_user_id, created_at')
      .eq('kunde_id', k.org.id)
      .eq('aktiv', true)
      .order('created_at', { ascending: true }),
  ])
  if (orgRes.error) logDbError('teo/arbeitsplatz/daten/team:org', orgRes.error)
  if (mRes.error) logDbError('teo/arbeitsplatz/daten/team:mitglieder', mRes.error)
  const mitglieder = mRes.data ?? []
  const ids = mitglieder.map((m) => String(m.id))
  const zuordRes = ids.length
    ? await supabaseAdmin.from('mitglied_objekte').select('mitglied_id, kunde_objekt_id').in('mitglied_id', ids)
    : { data: [], error: null }
  if (zuordRes.error) logDbError('teo/arbeitsplatz/daten/team:zuordnung', zuordRes.error)
  const objekteVon = new Map<string, string[]>()
  for (const z of zuordRes.data ?? []) {
    const l = objekteVon.get(String(z.mitglied_id)) ?? []
    l.push(String(z.kunde_objekt_id))
    objekteVon.set(String(z.mitglied_id), l)
  }

  const org = orgRes.data
  const haupt: ApTeamPerson[] = org?.email
    ? [
        {
          id: null,
          name: String(org.name ?? k.org.name),
          email: String(org.email),
          rolle: 'verwaltung',
          istAdmin: true,
          darfFreigeben: true,
          objektIds: [],
          eingeladen: false,
          istIch: k.person.mitgliedId === null,
        },
      ]
    : []

  return [
    ...haupt,
    ...mitglieder.map((m) => ({
      id: String(m.id),
      name: m.name?.trim() || String(m.email ?? ''),
      email: String(m.email ?? ''),
      rolle: (m.rolle as ApRolle) ?? 'verwaltung',
      istAdmin: Boolean(m.ist_admin),
      darfFreigeben: Boolean(m.darf_freigeben),
      objektIds: objekteVon.get(String(m.id)) ?? [],
      eingeladen: !m.auth_user_id,
      istIch: k.person.mitgliedId === String(m.id),
    })),
  ]
}

/** Team-Mitglieder (Rolle Team) — Auswahl „Person“ bei Plänen. */
export async function ladeTeamPersonen(k: ApKontext): Promise<Array<{ id: string; name: string }>> {
  const { data, error } = await supabaseAdmin
    .from('kunden_mitglieder')
    .select('id, name, email')
    .eq('kunde_id', k.org.id)
    .eq('rolle', 'team')
    .eq('aktiv', true)
    .order('name')
  if (error) logDbError('teo/arbeitsplatz/daten/team:teampersonen', error)
  return (data ?? []).map((m) => ({ id: String(m.id), name: (m.name as string | null)?.trim() || String(m.email ?? '') }))
}

/** Team-Mitglieder, die dieses Objekt betreuen — Auswahl „An Team geben“ im Vorgang. */
export async function ladeTeamFuerObjekt(k: ApKontext, objektId: string | null): Promise<Array<{ id: string; name: string }>> {
  if (!objektId) return []
  const personen = await ladeTeamPersonen(k)
  if (!personen.length) return []
  const { data, error } = await supabaseAdmin
    .from('mitglied_objekte')
    .select('mitglied_id')
    .eq('kunde_objekt_id', objektId)
    .in('mitglied_id', personen.map((p) => p.id))
  if (error) logDbError('teo/arbeitsplatz/daten/team:objekt', error)
  const ids = new Set((data ?? []).map((r) => String(r.mitglied_id)))
  return personen.filter((p) => ids.has(p.id))
}
