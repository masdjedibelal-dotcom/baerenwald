import { redirect } from 'next/navigation'

import { ladeAnlagen } from '@/teo/arbeitsplatz/daten/anlagen'
import { ladeObjekte } from '@/teo/arbeitsplatz/daten/objekte'
import { ladePlaene } from '@/teo/arbeitsplatz/daten/plaene'
import { ladeTeamPersonen } from '@/teo/arbeitsplatz/daten/team'
import { ladeApKontext } from '@/teo/arbeitsplatz/kontext'
import { PlaeneListe } from '@/teo/arbeitsplatz/plaene/PlaeneListe'
import { darf } from '@/teo/arbeitsplatz/rechte'

export const metadata = { title: 'Pläne' }

export default async function PlaeneSeite() {
  const k = await ladeApKontext()
  if (!k) redirect('/portal/login')
  const [plaene, objekte, teamPersonen, anlagen] = await Promise.all([ladePlaene(k), ladeObjekte(k), ladeTeamPersonen(k), ladeAnlagen(k)])
  const faellig = plaene.filter((p) => p.naechste && String(p.naechste).slice(0, 10) <= new Date().toISOString().slice(0, 10)).length
  return (
    <>
    <div className="wl-kopf">
      <h1>Pläne.</h1>
      <p>{faellig === 0 ? 'Nichts fällig.' : faellig === 1 ? '1 fällig.' : `${faellig} fällig.`}</p>
    </div>
    <PlaeneListe
      plaene={plaene}
      objekte={objekte.map((o) => ({ id: o.id, name: o.name }))}
      teamPersonen={teamPersonen}
      anlagen={anlagen.map((a) => ({ id: a.id, name: a.name, objektId: a.objektId }))}
      darfVerwalten={darf(k.person, 'plaene.verwalten')}
    />
    </>
  )
}
