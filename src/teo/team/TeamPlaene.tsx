'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { formatDatum } from '@/lib/shared-domain/geld-datum'
import { MockBadge, MockEmpty, MockIcon } from '@/teo/arbeitsplatz/kit'
import type { ApPlan } from '@/teo/arbeitsplatz/daten/plaene'
import { PlanAbhaken } from '@/teo/arbeitsplatz/plaene/PlanAbhaken'
import { PLAN_STAND, planStand } from '@/teo/arbeitsplatz/plaene/plan-logik'
import { ApSheet } from '@/teo/arbeitsplatz/shell/ApSheet'

/** Große Karten zum Antippen → Checkliste abhaken. */
export function TeamPlaene({ plaene, leer }: { plaene: ApPlan[]; leer: string }) {
  const router = useRouter()
  const [offen, setOffen] = useState<ApPlan | null>(null)
  const [gemeldet, setGemeldet] = useState<string | null>(null)

  return (
    <>
      {gemeldet ? (
        <div className="tm-hinweis" role="status">
          {gemeldet}
        </div>
      ) : null}
      {plaene.length ? (
        <ul className="tm-karten">
          {plaene.map((p) => {
            const stand = planStand(p.naechste)
            return (
              <li key={p.id}>
                <button type="button" className={stand === 'ueberfaellig' ? 'tm-karte is-rot' : 'tm-karte'} onClick={() => setOffen(p)}>
                  <span className="tm-karte__text">
                    <span className="tm-karte__titel">{p.titel}</span>
                    <span className="tm-karte__sub">
                      {p.objektName} · {formatDatum(p.naechste)}
                    </span>
                  </span>
                  {stand !== 'geplant' ? <MockBadge kind={PLAN_STAND[stand].badge}>{PLAN_STAND[stand].label}</MockBadge> : null}
                  <MockIcon ctx="default" n="chevron-right" size={18} />
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <MockEmpty icon="circle-check-filled" title={leer} />
      )}
      {offen ? (
        <ApSheet open titel={offen.titel} onClose={() => setOffen(null)}>
          <PlanAbhaken
            plan={offen}
            onFertig={(vorgangId) => {
              setGemeldet(vorgangId ? `${offen.titel} erledigt · Mangel an die Verwaltung gemeldet` : `${offen.titel} erledigt`)
              setOffen(null)
              router.refresh()
            }}
          />
        </ApSheet>
      ) : null}
    </>
  )
}
