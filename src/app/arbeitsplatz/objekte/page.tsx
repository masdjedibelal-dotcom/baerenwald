import { redirect } from 'next/navigation'

import { ladeObjekte, ladeVerwaltung } from '@/teo/arbeitsplatz/daten/objekte'
import { ladeApKontext } from '@/teo/arbeitsplatz/kontext'
import { ObjekteListe } from '@/teo/arbeitsplatz/objekte/ObjekteListe'
import { darf } from '@/teo/arbeitsplatz/rechte'

export const metadata = { title: 'Objekte' }

export default async function ObjekteSeite() {
  const k = await ladeApKontext()
  if (!k) redirect('/portal/login')
  const [objekte, verwaltung] = await Promise.all([ladeObjekte(k), ladeVerwaltung(k)])
  return <ObjekteListe objekte={objekte} darfBearbeiten={darf(k.person, 'objekte.bearbeiten')} verwaltung={verwaltung} />
}
