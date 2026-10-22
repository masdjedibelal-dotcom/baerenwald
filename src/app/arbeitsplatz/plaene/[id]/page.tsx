import { notFound, redirect } from 'next/navigation'

import { ladeAnlagen } from '@/teo/arbeitsplatz/daten/anlagen'
import { ladeObjekte } from '@/teo/arbeitsplatz/daten/objekte'
import { ladeErledigungen, ladePlaene } from '@/teo/arbeitsplatz/daten/plaene'
import { ladeTeamPersonen } from '@/teo/arbeitsplatz/daten/team'
import { ladeApKontext } from '@/teo/arbeitsplatz/kontext'
import { PlanDetail } from '@/teo/arbeitsplatz/plaene/PlanDetail'
import { darf } from '@/teo/arbeitsplatz/rechte'

export const metadata = { title: 'Plan' }

export default async function PlanSeite({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const k = await ladeApKontext()
  if (!k) redirect('/portal/login')
  const [plan] = await ladePlaene(k, { planId: id })
  if (!plan) notFound()
  const [erledigungen, objekte, teamPersonen, anlagen] = await Promise.all([ladeErledigungen(plan.id), ladeObjekte(k), ladeTeamPersonen(k), ladeAnlagen(k)])
  return (
    <PlanDetail
      plan={plan}
      erledigungen={erledigungen}
      objekte={objekte.map((o) => ({ id: o.id, name: o.name }))}
      teamPersonen={teamPersonen}
      anlagen={anlagen.map((a) => ({ id: a.id, name: a.name, objektId: a.objektId }))}
      rechte={{ verwalten: darf(k.person, 'plaene.verwalten'), abhaken: darf(k.person, 'plaene.abhaken') }}
    />
  )
}
