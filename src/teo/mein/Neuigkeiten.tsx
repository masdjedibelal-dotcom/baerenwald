'use client'

import { useState } from 'react'

import { MieterWlCard } from '@/components/melden/MieterWlFrame'
import { formatDatum } from '@/lib/shared-domain/geld-datum'
import type { ApMitteilung } from '@/teo/arbeitsplatz/daten/haus'

/** Neuigkeiten der Verwaltung: Liste (Datum links, Titel rechts, neueste oben), Klick öffnet die Mitteilung. */
export function Neuigkeiten({ mitteilungen }: { mitteilungen: ApMitteilung[] }) {
  const [offenId, setOffenId] = useState<string | null>(null)
  const offen = mitteilungen.find((m) => m.id === offenId) ?? null

  if (offen) {
    return (
      <MieterWlCard className="mein-news">
        <button type="button" className="mein-news__zurueck" onClick={() => setOffenId(null)}>
          ← Alle Neuigkeiten
        </button>
        <div className="mein-news__titel">{offen.titel}</div>
        <div className="mein-news__datum">{formatDatum(offen.erstellt)}</div>
        {offen.text ? <div className="mein-news__text">{offen.text}</div> : null}
      </MieterWlCard>
    )
  }

  return (
    <MieterWlCard className="mein-news">
      <div className="mein-news__kopf">Neuigkeiten</div>
      <ul className="mein-news__liste">
        {mitteilungen.map((m) => (
          <li key={m.id}>
            <button type="button" className="mein-news__zeile" onClick={() => setOffenId(m.id)}>
              <span className="mein-news__zeile-datum">{formatDatum(m.erstellt)}</span>
              <span className="mein-news__zeile-titel">{m.titel}</span>
            </button>
          </li>
        ))}
      </ul>
    </MieterWlCard>
  )
}
