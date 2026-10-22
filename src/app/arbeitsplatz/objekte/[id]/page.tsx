import { notFound, redirect } from 'next/navigation'

import { ladeAnlagen } from '@/teo/arbeitsplatz/daten/anlagen'
import { ladeEinheiten } from '@/teo/arbeitsplatz/daten/einheiten'
import { ladeMitteilungen, ladeObjektDokumente } from '@/teo/arbeitsplatz/daten/haus'
import { ladeObjekt } from '@/teo/arbeitsplatz/daten/objekte'
import { ladePlaene } from '@/teo/arbeitsplatz/daten/plaene'
import { ladeApKontext } from '@/teo/arbeitsplatz/kontext'
import { ObjektDetail } from '@/teo/arbeitsplatz/objekte/ObjektDetail'
import { darf } from '@/teo/arbeitsplatz/rechte'

export const metadata = { title: 'Objekt' }

export default async function ObjektSeite({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const k = await ladeApKontext()
  if (!k) redirect('/portal/login')
  const d = await ladeObjekt(k, id)
  if (!d) notFound()
  const [plaene, anlagen, mitteilungen, dokumente, einheiten] = await Promise.all([
    ladePlaene(k, { objektId: id }),
    ladeAnlagen(k, id),
    ladeMitteilungen([id]),
    ladeObjektDokumente(k.org.id, [id]),
    ladeEinheiten(k.org.id, [id]),
  ])
  return (
    <ObjektDetail
      d={d}
      plaene={plaene}
      anlagen={anlagen}
      mitteilungen={mitteilungen}
      dokumente={dokumente}
      einheiten={einheiten}
      rechte={{
        bearbeiten: darf(k.person, 'objekte.bearbeiten'),
        kosten: darf(k.person, 'kosten.sehen'),
        vorgangAnlegen: darf(k.person, 'vorgang.anlegen'),
        plaene: darf(k.person, 'plaene.verwalten'),
        dokumente: darf(k.person, 'dokumente.hochladen'),
      }}
    />
  )
}
