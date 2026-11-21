import { redirect } from 'next/navigation'

import { ladeApKontext } from '@/teo/arbeitsplatz/kontext'
import { ladeMeinePlaene } from '@/teo/team/team-daten'
import { TeamPlaene } from '@/teo/team/TeamPlaene'

export const metadata = { title: 'Pläne' }

export default async function TeamPlaeneSeite() {
  const k = await ladeApKontext()
  if (!k) redirect('/portal/login?next=/team')
  const plaene = await ladeMeinePlaene(k)
  return (
    <>
      <div className="wl-kopf">
        <h1>Pläne.</h1>
        <p>{plaene.length === 1 ? '1 Plan.' : `${plaene.length} Pläne.`}</p>
      </div>
      <TeamPlaene plaene={plaene} leer="Noch keine Pläne" />
    </>
  )
}
