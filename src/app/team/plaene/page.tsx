import { redirect } from 'next/navigation'

import { ladeApKontext } from '@/teo/arbeitsplatz/kontext'
import { ladeMeinePlaene } from '@/teo/team/team-daten'
import { TeamPlaene } from '@/teo/team/TeamPlaene'

export const metadata = { title: 'Pläne' }

export default async function TeamPlaeneSeite() {
  const k = await ladeApKontext()
  if (!k) redirect('/portal/login?next=/team')
  return (
    <>
      <h1 className="tm-titel">Pläne</h1>
      <TeamPlaene plaene={await ladeMeinePlaene(k)} leer="Noch keine Pläne" />
    </>
  )
}
