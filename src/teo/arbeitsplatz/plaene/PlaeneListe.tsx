'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo } from 'react'

import { formatDatum } from '@/lib/shared-domain/geld-datum'
import { MockBadge, MockChip, MockEmpty, MockSelect } from '@/teo/arbeitsplatz/kit'
import type { ApPlan } from '@/teo/arbeitsplatz/daten/plaene'
import { PlanFormular, type AnlageAuswahl } from '@/teo/arbeitsplatz/plaene/PlanFormular'
import { intervallText, PLAN_STAND, planStand } from '@/teo/arbeitsplatz/plaene/plan-logik'

const SPALTEN = 'minmax(0, 2fr) minmax(0, 1.4fr) 130px 120px'
type Filter = 'faellig' | 'ueberfaellig' | 'alle'

export function PlaeneListe({
  plaene,
  objekte,
  teamPersonen,
  anlagen,
  darfVerwalten,
}: {
  plaene: ApPlan[]
  objekte: Array<{ id: string; name: string }>
  teamPersonen: Array<{ id: string; name: string }>
  anlagen: AnlageAuswahl
  darfVerwalten: boolean
}) {
  const router = useRouter()
  const params = useSearchParams()
  const filter = (params.get('filter') as Filter | null) ?? 'alle'
  const objekt = params.get('objekt') ?? ''
  const neu = params.get('neu') === '1' && darfVerwalten

  function setzen(key: string, wert: string | null) {
    const p = new URLSearchParams(params.toString())
    if (wert) p.set(key, wert)
    else p.delete(key)
    router.replace(`/arbeitsplatz/plaene${p.toString() ? `?${p}` : ''}`, { scroll: false })
  }

  const mitStand = useMemo(() => plaene.map((p) => ({ ...p, stand: planStand(p.naechste) })), [plaene])
  const imObjekt = mitStand.filter((p) => !objekt || p.objektId === objekt)
  const anzahl = {
    alle: imObjekt.length,
    faellig: imObjekt.filter((p) => p.stand !== 'geplant').length,
    ueberfaellig: imObjekt.filter((p) => p.stand === 'ueberfaellig').length,
  }
  const sichtbar = imObjekt.filter((p) => filter === 'alle' || (filter === 'faellig' ? p.stand !== 'geplant' : p.stand === 'ueberfaellig'))

  return (
    <div>
      <div className="listbar">
        <div className="listbar-main">
          <div className="listbar-chips" role="group" aria-label="Fälligkeit">
            <MockChip active={filter === 'alle'} count={anzahl.alle} onClick={() => setzen('filter', null)}>
              Alle
            </MockChip>
            <MockChip active={filter === 'faellig'} count={anzahl.faellig} onClick={() => setzen('filter', 'faellig')}>
              Fällig
            </MockChip>
            <MockChip active={filter === 'ueberfaellig'} count={anzahl.ueberfaellig} onClick={() => setzen('filter', 'ueberfaellig')}>
              Überfällig
            </MockChip>
          </div>
        </div>
        {objekte.length > 1 ? (
          <div className="ap-filterzeile">
            <MockSelect value={objekt} onChange={(e) => setzen('objekt', e.target.value || null)} aria-label="Objekt">
              <option value="">Alle Objekte</option>
              {objekte.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </MockSelect>
          </div>
        ) : null}
      </div>

      {sichtbar.length === 0 ? (
        <MockEmpty icon="checklist" title={plaene.length ? 'Nichts fällig' : 'Noch keine Pläne'} />
      ) : (
        <div className="listcard">
          <div className="list-row head" style={{ gridTemplateColumns: SPALTEN }} aria-hidden>
            <div>Plan</div>
            <div>Objekt</div>
            <div>Rhythmus</div>
            <div>Nächste</div>
          </div>
          {sichtbar.map((p) => (
            <Link key={p.id} href={`/arbeitsplatz/plaene/${p.id}`} className="list-row" style={{ gridTemplateColumns: SPALTEN }}>
              <div className="ap-zelle-titel">
                <div className="lc-title">{p.titel}</div>
                <div className="lc-pills">
                  {p.stand !== 'geplant' ? <MockBadge kind={PLAN_STAND[p.stand].badge}>{PLAN_STAND[p.stand].label}</MockBadge> : null}
                  <MockBadge kind="plain">{p.zustaendig === 'teo' ? 'TEO' : p.zustaendigName ?? 'Team'}</MockBadge>
                </div>
              </div>
              <div className="lc-sub">{p.objektName}</div>
              <div className="lc-desk ap-gedimmt">{intervallText(p.einheit, p.anzahl)}</div>
              <div className={p.stand === 'ueberfaellig' ? 'lc-desk ap-rot' : 'lc-desk'}>{formatDatum(p.naechste)}</div>
            </Link>
          ))}
        </div>
      )}

      {neu ? (
        <PlanFormular
          planId={null}
          start={{ objektId: objekt || undefined }}
          objekte={objekte}
          teamPersonen={teamPersonen}
          anlagen={anlagen}
          onClose={() => setzen('neu', null)}
        />
      ) : null}
    </div>
  )
}
