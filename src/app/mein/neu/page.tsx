import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { istTeo } from '@/lib/marke'
import { ladeEinheiten } from '@/teo/arbeitsplatz/daten/einheiten'
import { ladeApKontext } from '@/teo/arbeitsplatz/kontext'
import { ladeEigentuemerObjekte } from '@/teo/mein/mein-daten'
import { NeuerVorgang } from '@/teo/arbeitsplatz/vorgaenge/NeuerVorgang'

import '@/teo/arbeitsplatz/kit/tokens.css'
import '@/teo/arbeitsplatz/kit/crm.css'
import '@/teo/arbeitsplatz/kit/utilities.css'
import '@/teo/arbeitsplatz/arbeitsplatz.css'
import '@/teo/website-look.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Neue Anfrage', robots: { index: false, follow: false } }

/** MeinTEO: Eigentümer melden wie die Verwaltung — gleicher geführter Ablauf. */
export default async function MeinNeuSeite({ searchParams }: { searchParams: Promise<{ objekt?: string }> }) {
  if (!istTeo) notFound()
  const { objekt } = await searchParams
  const k = await ladeApKontext()
  if (!k) redirect('/portal/login?next=/mein/neu')
  if (k.person.rolle !== 'eigentuemer') redirect('/mein')
  const objekte = await ladeEigentuemerObjekte(k)
  if (!objekte.length) redirect('/mein')
  const einheiten = await ladeEinheiten(k.org.id, objekte.map((o) => o.id))
  return (
    <div className="app ap-wl ap-mein-neu">
      <main className="page">
        <div className="page-inner">
          <NeuerVorgang
            objekte={objekte.map((o) => ({ id: o.id, name: o.name }))}
            einheiten={einheiten.map((e) => ({ objektId: e.objektId, bezeichnung: e.bezeichnung }))}
            vorauswahl={objekt ?? null}
            fertigHref="/mein"
          />
        </div>
      </main>
    </div>
  )
}
