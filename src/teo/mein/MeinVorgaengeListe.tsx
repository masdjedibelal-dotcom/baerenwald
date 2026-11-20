'use client'

import Link from 'next/link'
import { useState } from 'react'

export type MeinListenEintrag = {
  id: string
  titel: string
  meta: string
  status: string
  erledigt: boolean
  href?: string | null
}

type Filter = 'offen' | 'erledigt' | 'alle'

/**
 * MeinTEO: Liste wie in den anderen Oberflächen — Filter-Chips oben, jeder Vorgang als eigene Karte.
 */
export function MeinVorgaengeListe({ eintraege, leerText }: { eintraege: MeinListenEintrag[]; leerText: string }) {
  const offen = eintraege.filter((e) => !e.erledigt).length
  const erledigt = eintraege.length - offen
  const [filter, setFilter] = useState<Filter>(offen ? 'offen' : 'alle')
  const sichtbar = eintraege.filter((e) => (filter === 'alle' ? true : filter === 'offen' ? !e.erledigt : e.erledigt))

  if (!eintraege.length) return <p className="mein-leer">{leerText}</p>

  return (
    <div className="mein-liste">
      <div className="mein-chips" role="tablist" aria-label="Filter">
        {(
          [
            { id: 'offen', label: 'Offen', n: offen },
            { id: 'erledigt', label: 'Erledigt', n: erledigt },
            { id: 'alle', label: 'Alle', n: eintraege.length },
          ] as const
        ).map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={filter === c.id}
            className={filter === c.id ? 'mein-chip is-on' : 'mein-chip'}
            onClick={() => setFilter(c.id)}
          >
            {c.label} <span className="mein-chip__n">{c.n}</span>
          </button>
        ))}
      </div>
      {sichtbar.length ? (
        <div className="mieter-wl-objekt-list">
          {sichtbar.map((e) => {
            const inhalt = (
              <>
                <span className="min-w-0 flex-1">
                  <span className="mieter-wl-objekt-item-title block">{e.titel}</span>
                  <span className="mieter-wl-objekt-item-meta block">{e.meta}</span>
                </span>
                <span className={e.erledigt ? 'mein-pill mein-pill--fertig' : 'mein-pill'}>{e.status}</span>
              </>
            )
            return e.href ? (
              <Link key={e.id} href={e.href} className="mieter-wl-objekt-item">
                {inhalt}
              </Link>
            ) : (
              <div key={e.id} className="mieter-wl-objekt-item">
                {inhalt}
              </div>
            )
          })}
        </div>
      ) : (
        <p className="mein-leer">{filter === 'offen' ? 'Nichts offen.' : 'Noch nichts erledigt.'}</p>
      )}
    </div>
  )
}
