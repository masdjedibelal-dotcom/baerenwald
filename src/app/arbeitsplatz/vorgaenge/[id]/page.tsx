import { notFound, redirect } from 'next/navigation'

import { ladeVorgangDetail } from '@/teo/arbeitsplatz/daten/vorgang-detail'
import { ladeApKontext } from '@/teo/arbeitsplatz/kontext'
import { darf } from '@/teo/arbeitsplatz/rechte'
import { VorgangDetail } from '@/teo/arbeitsplatz/vorgaenge/VorgangDetail'

export const metadata = { title: 'Vorgang' }

export default async function VorgangSeite({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const k = await ladeApKontext()
  if (!k) redirect('/portal/login')
  const d = await ladeVorgangDetail(k, id)
  if (!d) notFound()
  return (
    <VorgangDetail
      d={d}
      rechte={{
        anTeo: darf(k.person, 'vorgang.an_teo'),
        freigeben: darf(k.person, 'vorgang.freigeben'),
        nachricht: darf(k.person, 'vorgang.nachricht'),
        kosten: darf(k.person, 'kosten.sehen'),
      }}
    />
  )
}
