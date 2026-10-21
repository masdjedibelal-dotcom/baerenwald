import { redirect } from 'next/navigation'

import { supabaseAdmin } from '@/lib/supabase'
import { EinstellungenSeite } from '@/teo/arbeitsplatz/einstellungen/EinstellungenSeite'
import { ladeApKontext } from '@/teo/arbeitsplatz/kontext'
import { darf } from '@/teo/arbeitsplatz/rechte'

export const metadata = { title: 'Einstellungen' }

export default async function EinstellungenRoute() {
  const k = await ladeApKontext()
  if (!k) redirect('/portal/login')
  if (!darf(k.person, 'einstellungen')) redirect('/arbeitsplatz')
  const { data } = await supabaseAdmin
    .from('kunden')
    .select('name, org_anzeigename, org_typ, freigabe_schwelle_eur, akut_fall_ids, impressum_url, datenschutz_url')
    .eq('id', k.org.id)
    .maybeSingle()
  return (
    <EinstellungenSeite
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
