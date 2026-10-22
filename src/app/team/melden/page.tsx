import { redirect } from 'next/navigation'

import { ladeEinheiten } from '@/teo/arbeitsplatz/daten/einheiten'
import { ladeObjekte } from '@/teo/arbeitsplatz/daten/objekte'
import { ladeApKontext } from '@/teo/arbeitsplatz/kontext'
import { TeamMelden } from '@/teo/team/TeamMelden'

export const metadata = { title: 'Melden' }

export default async function TeamMeldenSeite() {
  const k = await ladeApKontext()
  if (!k) redirect('/portal/login?next=/team')
  const objekte = await ladeObjekte(k)
  const einheiten = await ladeEinheiten(k.org.id, objekte.map((o) => o.id))
  return (
    <>
      <h1 className="tm-titel">Melden</h1>
      <TeamMelden
        objekte={objekte.map((o) => ({ id: o.id, name: o.name }))}
        einheiten={einheiten.map((e) => ({ objektId: e.objektId, bezeichnung: e.bezeichnung }))}
      />
    </>
  )
}
