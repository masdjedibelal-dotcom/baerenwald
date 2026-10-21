import { redirect } from 'next/navigation'

import { ladeObjekte } from '@/teo/arbeitsplatz/daten/objekte'
import { ladeTeam } from '@/teo/arbeitsplatz/daten/team'
import { ladeApKontext } from '@/teo/arbeitsplatz/kontext'
import { darf } from '@/teo/arbeitsplatz/rechte'
import { TeamSeite } from '@/teo/arbeitsplatz/team/TeamSeite'

export const metadata = { title: 'Team' }

export default async function TeamRoute() {
  const k = await ladeApKontext()
  if (!k) redirect('/portal/login')
  if (!darf(k.person, 'team.verwalten')) redirect('/arbeitsplatz')
  const [personen, objekte] = await Promise.all([ladeTeam(k), ladeObjekte(k)])
  return <TeamSeite personen={personen} objekte={objekte.map((o) => ({ id: o.id, name: o.name }))} />
}
