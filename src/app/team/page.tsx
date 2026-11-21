import { redirect } from 'next/navigation'

import { ladeApKontext } from '@/teo/arbeitsplatz/kontext'
import { planStand } from '@/teo/arbeitsplatz/plaene/plan-logik'
import { ladeMeinePlaene, ladeMeineVorgaenge } from '@/teo/team/team-daten'
import { TeamPlaene } from '@/teo/team/TeamPlaene'
import { TeamVorgaenge } from '@/teo/team/TeamVorgaenge'

export const metadata = { title: 'Heute' }

export default async function TeamHeute() {
  const k = await ladeApKontext()
  if (!k) redirect('/portal/login?next=/team')
  const [plaene, vorgaenge] = await Promise.all([ladeMeinePlaene(k), ladeMeineVorgaenge(k)])
  const faellig = plaene.filter((p) => planStand(p.naechste) !== 'geplant')
  return (
    <>
      {/* Überschrift wie im Arbeitsplatz: Titel und blaue Zeile */}
      <div className="wl-kopf">
        <h1>Heute.</h1>
        <p>{vorgaenge.length + faellig.length === 0 ? 'Nichts zu tun.' : vorgaenge.length + faellig.length === 1 ? '1 Aufgabe.' : `${vorgaenge.length + faellig.length} Aufgaben.`}</p>
      </div>
      <TeamVorgaenge vorgaenge={vorgaenge} />
      <TeamPlaene plaene={faellig} leer="Heute ist nichts fällig" />
    </>
  )
}
