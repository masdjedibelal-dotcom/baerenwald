'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { formatDatum, formatDatumZeit } from '@/lib/shared-domain/geld-datum'
import { MockBadge, MockBtn, MockCard, MockEmpty, MockProp } from '@/teo/arbeitsplatz/kit'
import type { ApErledigung, ApPlan } from '@/teo/arbeitsplatz/daten/plaene'
import { PlanAbhaken } from '@/teo/arbeitsplatz/plaene/PlanAbhaken'
import { PlanFormular, type AnlageAuswahl } from '@/teo/arbeitsplatz/plaene/PlanFormular'
import { intervallText, PLAN_ART_LABEL, PLAN_STAND, planStand } from '@/teo/arbeitsplatz/plaene/plan-logik'
import { ApSheet } from '@/teo/arbeitsplatz/shell/ApSheet'

export function PlanDetail({
  plan,
  erledigungen,
  objekte,
  teamPersonen,
  anlagen,
  rechte,
}: {
  plan: ApPlan
  erledigungen: ApErledigung[]
  objekte: Array<{ id: string; name: string }>
  teamPersonen: Array<{ id: string; name: string }>
  anlagen: AnlageAuswahl
  rechte: { verwalten: boolean; abhaken: boolean }
}) {
  const router = useRouter()
  const [bearbeiten, setBearbeiten] = useState(false)
  const [abhaken, setAbhaken] = useState(false)
  const stand = planStand(plan.naechste)

  return (
    <div className="detail-entity-page">
      <header className="detail-head detail-head--project">
        <div className="detail-head-main vgid min-w-0 flex-1">
          <div className="dh-titlerow">
            <div className="dh-title vgid-name">{plan.titel}</div>
          </div>
          <div className="dh-meta vgid-meta">
            {stand !== 'geplant' ? <MockBadge kind={PLAN_STAND[stand].badge}>{PLAN_STAND[stand].label}</MockBadge> : null}
            <span>{plan.objektName}</span>
            <span className="sep" aria-hidden>·</span>
            <span>{intervallText(plan.einheit, plan.anzahl)}</span>
          </div>
        </div>
        <div className="detail-head-actions min-w-0">
          {rechte.verwalten ? (
            <MockBtn kind="secondary" sm type="button" onClick={() => setBearbeiten(true)}>
              Bearbeiten
            </MockBtn>
          ) : null}
          {rechte.abhaken && plan.zustaendig === 'team' ? (
            <MockBtn kind="primary" sm type="button" onClick={() => setAbhaken(true)}>
              Abhaken
            </MockBtn>
          ) : null}
        </div>
      </header>

      <div className="ap-start">
        <MockCard title="Plan" icon="checklist">
          <div className="props">
            <MockProp label="Objekt">
              <Link className="link" href={`/arbeitsplatz/objekte/${plan.objektId}`}>
                {plan.objektName}
              </Link>
            </MockProp>
            <MockProp label="Art">{PLAN_ART_LABEL[plan.art]}</MockProp>
            <MockProp label="Rhythmus">{intervallText(plan.einheit, plan.anzahl)}</MockProp>
            <MockProp label="Nächste Fälligkeit">{formatDatum(plan.naechste)}</MockProp>
            <MockProp label="Wer erledigt">{plan.zustaendig === 'teo' ? 'TEO · 3 Wochen vorher beauftragt' : plan.zustaendigName ?? 'Team'}</MockProp>
            {plan.zustaendig === 'team' ? <MockProp label="Für Mieter sichtbar">{plan.mieter ? 'Ja' : 'Nein'}</MockProp> : null}
          </div>
        </MockCard>

        {plan.checkliste.length ? (
          <MockCard title="Checkliste" icon="list-details">
            <ol className="ap-liste-nummer">
              {plan.checkliste.map((c) => (
                <li key={c.id}>{c.text}</li>
              ))}
            </ol>
          </MockCard>
        ) : null}

        <MockCard title="Nachweise" icon="history">
          {erledigungen.length ? (
            <ol className="ap-verlauf">
              {erledigungen.map((e) => {
                const maengel = e.punkte.filter((p) => !p.ok)
                return (
                  <li key={e.id}>
                    <div className="ap-verlauf__kopf">
                      <span className="ap-verlauf__titel">
                        {!e.punkte.length && e.vorgangId ? e.wer : `${maengel.length ? `${maengel.length} nicht in Ordnung` : 'Alles in Ordnung'} · ${e.wer}`}
                      </span>
                      <span className="ap-gedimmt">{formatDatumZeit(e.erledigtAm)}</span>
                    </div>
                    {maengel.length ? <div className="ap-verlauf__text ap-rot">{maengel.map((m) => m.text).join(', ')}</div> : null}
                    {e.notiz ? <div className="ap-verlauf__text">{e.notiz}</div> : null}
                    {e.vorgangId ? (
                      <Link className="link" href={`/arbeitsplatz/vorgaenge/${e.vorgangId}`}>
                        Vorgang öffnen
                      </Link>
                    ) : null}
                    {e.fotos.length ? (
                      <div className="ap-fotos">
                        {e.fotos.map((u) => (
                          <a key={u} href={u} target="_blank" rel="noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={u} alt="" loading="lazy" />
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ol>
          ) : (
            <MockEmpty icon="history" title={plan.zustaendig === 'teo' ? 'Noch nicht beauftragt' : 'Noch nicht erledigt'} />
          )}
        </MockCard>
      </div>

      {bearbeiten ? (
        <PlanFormular
          planId={plan.id}
          objekte={objekte}
          teamPersonen={teamPersonen}
          anlagen={anlagen}
          onClose={() => setBearbeiten(false)}
          start={{
            titel: plan.titel,
            art: plan.art,
            objektId: plan.objektId,
            anlageId: plan.anlageId,
            einheit: plan.einheit,
            anzahl: plan.anzahl,
            naechste: plan.naechste,
            zustaendig: plan.zustaendig,
            zustaendigId: plan.zustaendigId,
            punkte: plan.checkliste.map((c) => c.text),
            mieter: plan.mieter,
          }}
        />
      ) : null}
      {abhaken ? (
        <ApSheet open titel={plan.titel} onClose={() => setAbhaken(false)}>
          <PlanAbhaken
            plan={plan}
            onFertig={() => {
              setAbhaken(false)
              router.refresh()
            }}
          />
        </ApSheet>
      ) : null}
    </div>
  )
}
