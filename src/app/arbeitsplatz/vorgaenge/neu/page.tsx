import { redirect } from 'next/navigation'

import { ladeObjekte } from '@/teo/arbeitsplatz/daten/objekte'
import { ladeApKontext } from '@/teo/arbeitsplatz/kontext'
import { darf } from '@/teo/arbeitsplatz/rechte'
import { NeuerVorgang } from '@/teo/arbeitsplatz/vorgaenge/NeuerVorgang'

export const metadata = { title: 'Neuer Vorgang' }

export default async function NeuerVorgangSeite({ searchParams }: { searchParams: Promise<{ objekt?: string }> }) {
  const { objekt } = await searchParams
  const k = await ladeApKontext()
  if (!k) redirect('/portal/login')
  if (!darf(k.person, 'vorgang.anlegen')) redirect('/arbeitsplatz/vorgaenge')
  const objekte = await ladeObjekte(k)
  if (!objekte.length) redirect('/arbeitsplatz/objekte')
  return <NeuerVorgang objekte={objekte.map((o) => ({ id: o.id, name: o.name }))} vorauswahl={objekt ?? null} />
}
