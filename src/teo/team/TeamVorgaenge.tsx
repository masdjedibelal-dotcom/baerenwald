'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { ladeAnfrageFotosHoch } from '@/lib/funnel/fotos-hochladen'
import { formatDatum } from '@/lib/shared-domain/geld-datum'
import { MockBadge, MockBtn, MockField, MockIcon, MockTextarea } from '@/teo/arbeitsplatz/kit'
import { teamErgebnisMelden } from '@/teo/arbeitsplatz/aktionen/vorgang'
import { ApSheet } from '@/teo/arbeitsplatz/shell/ApSheet'
import type { TeamVorgang } from '@/teo/team/team-daten'

/** Vorgänge von der Verwaltung: anschauen, Fotos und Befund, dann „Erledigt“ oder „Braucht Fachbetrieb“. */
export function TeamVorgaenge({ vorgaenge }: { vorgaenge: TeamVorgang[] }) {
  const router = useRouter()
  const [offen, setOffen] = useState<TeamVorgang | null>(null)
  const [hinweis, setHinweis] = useState<string | null>(null)

  if (!vorgaenge.length && !hinweis) return null
  return (
    <>
      {hinweis ? (
        <div className="tm-hinweis" role="status">
          {hinweis}
        </div>
      ) : null}
      {vorgaenge.length ? (
        <ul className="tm-karten">
          {vorgaenge.map((v) => (
            <li key={v.id}>
              <button type="button" className="tm-karte" onClick={() => setOffen(v)}>
                <span className="tm-karte__text">
                  <span className="tm-karte__titel">{v.titel}</span>
                  <span className="tm-karte__sub">{[v.objektName, v.einheit, v.seit ? `seit ${formatDatum(v.seit)}` : null].filter(Boolean).join(' · ')}</span>
                </span>
                <MockBadge kind="warten">Ansehen</MockBadge>
                <MockIcon ctx="default" n="chevron-right" size={18} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {offen ? (
        <ApSheet open titel={offen.titel} onClose={() => setOffen(null)}>
          <Befund
            v={offen}
            onFertig={(text) => {
              setHinweis(text)
              setOffen(null)
              router.refresh()
            }}
          />
        </ApSheet>
      ) : null}
    </>
  )
}

function Befund({ v, onFertig }: { v: TeamVorgang; onFertig: (hinweis: string) => void }) {
  const [notiz, setNotiz] = useState('')
  const [dateien, setDateien] = useState<File[]>([])
  const [fehler, setFehler] = useState<string | null>(null)
  const [laeuft, starten] = useTransition()

  function senden(ergebnis: 'erledigt' | 'fachbetrieb') {
    setFehler(null)
    starten(async () => {
      let fotos: string[] = []
      if (dateien.length) {
        try {
          fotos = (await ladeAnfrageFotosHoch(dateien, `team-${v.id}`, 8)).urls
        } catch {
          setFehler('Fotos konnten nicht hochgeladen werden.')
          return
        }
      }
      const r = await teamErgebnisMelden(v.id, { ergebnis, notiz, fotos })
      if (!r.ok) {
        setFehler(r.fehler)
        return
      }
      const titel = v.titel.replace(/[.!?…]+$/, '')
      onFertig(ergebnis === 'erledigt' ? `Erledigt: ${titel}` : `An TEO gegeben, ein Fachbetrieb kommt: ${titel}`)
    })
  }

  return (
    <div className="tm-formular">
      <div className="props">
        {v.objektName ? <div>{[v.objektName, v.einheit].filter(Boolean).join(' · ')}</div> : null}
        {v.melder ? (
          <div className="ap-gedimmt">
            Gemeldet von {v.melder}
            {v.telefon ? (
              <>
                {' · '}
                <a href={`tel:${v.telefon.replace(/\s/g, '')}`}>{v.telefon}</a>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
      {v.beschreibung ? <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{v.beschreibung}</p> : null}
      {v.fotos.length ? (
        <div className="ap-fotos">
          {v.fotos.slice(0, 8).map((u) => (
            <a key={u} href={u} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" loading="lazy" />
            </a>
          ))}
        </div>
      ) : null}
      <MockField label="Was haben Sie gesehen oder gemacht?" full>
        <MockTextarea value={notiz} onChange={(e) => setNotiz(e.target.value)} rows={4} />
      </MockField>
      <label className="ap-datei tm-foto">
        <MockIcon ctx="default" n="camera" size={20} />
        <span>{dateien.length ? `${dateien.length} Foto${dateien.length === 1 ? '' : 's'}` : 'Foto aufnehmen'}</span>
        <input type="file" accept="image/*" capture="environment" multiple onChange={(e) => setDateien(Array.from(e.target.files ?? []).slice(0, 8))} />
      </label>
      {fehler ? (
        <div className="ap-fehler" role="alert">
          {fehler}
        </div>
      ) : null}
      <MockBtn kind="primary" type="button" className="tm-senden" disabled={laeuft} onClick={() => senden('erledigt')}>
        {laeuft ? 'Wird gespeichert …' : 'Erledigt'}
      </MockBtn>
      <MockBtn kind="secondary" type="button" className="tm-senden" disabled={laeuft || notiz.trim().length < 5} onClick={() => senden('fachbetrieb')}>
        Braucht Fachbetrieb
      </MockBtn>
    </div>
  )
}
