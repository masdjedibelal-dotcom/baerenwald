import { notFound, redirect } from 'next/navigation'

import { ladeTeamFuerObjekt } from '@/teo/arbeitsplatz/daten/team'
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
  const anTeo = darf(k.person, 'vorgang.an_teo')
  const team = anTeo ? await ladeTeamFuerObjekt(k, d.zeile.objektId) : []
  return (
    <VorgangDetail
      d={d}
      team={team}
      weg={k.org.orgTyp === 'weg'}
      rechte={{
        anTeo,
        freigeben: darf(k.person, 'vorgang.freigeben'),
        nachricht: darf(k.person, 'vorgang.nachricht'),
        kosten: darf(k.person, 'kosten.sehen'),
      }}
    />
  )
}
