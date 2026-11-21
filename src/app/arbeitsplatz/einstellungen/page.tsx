import { redirect } from 'next/navigation'

import { supabaseAdmin } from '@/lib/supabase'
import { ladeOrgLogo } from '@/teo/arbeitsplatz/druck/DruckKopf'
import { EinstellungenSeite } from '@/teo/arbeitsplatz/einstellungen/EinstellungenSeite'
import { ladeApKontext } from '@/teo/arbeitsplatz/kontext'
import { darf } from '@/teo/arbeitsplatz/rechte'

export const metadata = { title: 'Einstellungen' }

/** Gleiche Regel wie im CRM (teo/hv/auftrag-per-mail): auftrag+<kennung>@<Eingangsdomain> */
function auftragsAdresse(kennung: string | null | undefined): string | null {
  const m = process.env.AUFTRAG_EINGANG_EMAIL?.trim().toLowerCase().match(/^([a-z0-9._-]+)@([a-z0-9.-]+\.[a-z]{2,})$/)
  const k = kennung?.trim().toLowerCase()
  if (!m || !k) return null
  return `${m[1]}+${k}@${m[2]}`
}

export default async function EinstellungenRoute() {
  const k = await ladeApKontext()
  if (!k) redirect('/portal/login')
  if (!darf(k.person, 'einstellungen')) redirect('/arbeitsplatz')
  const [{ data }, logoUrl] = await Promise.all([
    supabaseAdmin
      .from('kunden')
      .select('name, org_anzeigename, org_typ, org_kennung, freigabe_schwelle_eur, akut_fall_ids, impressum_url, datenschutz_url')
      .eq('id', k.org.id)
      .maybeSingle(),
    ladeOrgLogo(k.org.id),
  ])
  return (
    <EinstellungenSeite
      logoUrl={logoUrl}
      schadenAdresse={auftragsAdresse(data?.org_kennung as string | null | undefined)}
      start={{
        anzeigename: String(data?.org_anzeigename ?? data?.name ?? ''),
        orgTyp: data?.org_typ === 'weg' ? 'weg' : 'hv',
        freigabeSchwelle: data?.freigabe_schwelle_eur != null ? String(data.freigabe_schwelle_eur).replace('.', ',') : '',
        akutFallIds: Array.isArray(data?.akut_fall_ids) ? (data.akut_fall_ids as string[]) : [],
        impressumUrl: String(data?.impressum_url ?? ''),
        datenschutzUrl: String(data?.datenschutz_url ?? ''),
      }}
    />
  )
}
