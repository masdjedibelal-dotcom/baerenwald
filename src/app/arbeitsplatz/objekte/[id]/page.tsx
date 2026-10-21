import { notFound, redirect } from 'next/navigation'

import { ladeObjekt } from '@/teo/arbeitsplatz/daten/objekte'
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
  return (
    <ObjektDetail
      d={d}
      rechte={{
        bearbeiten: darf(k.person, 'objekte.bearbeiten'),
        kosten: darf(k.person, 'kosten.sehen'),
        vorgangAnlegen: darf(k.person, 'vorgang.anlegen'),
      }}
    />
  )
}
