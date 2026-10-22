import { redirect } from 'next/navigation'

import { ladeApKontext } from '@/teo/arbeitsplatz/kontext'
import { planStand } from '@/teo/arbeitsplatz/plaene/plan-logik'
import { ladeMeinePlaene } from '@/teo/team/team-daten'
import { TeamPlaene } from '@/teo/team/TeamPlaene'

export const metadata = { title: 'Heute' }

export default async function TeamHeute() {
  const k = await ladeApKontext()
  if (!k) redirect('/portal/login?next=/team')
  const faellig = (await ladeMeinePlaene(k)).filter((p) => planStand(p.naechste) !== 'geplant')
  return (
    <>
      <h1 className="tm-titel">Heute</h1>
      <TeamPlaene plaene={faellig} leer="Heute ist nichts fällig" />
    </>
  )
}
