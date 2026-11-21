'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'

import { formatEuro } from '@/lib/shared-domain/geld-datum'
import { MockBtn, MockEmpty, MockIcon, MockInput } from '@/teo/arbeitsplatz/kit'
import type { ApObjektZeile, ApPersonKurz } from '@/teo/arbeitsplatz/daten/objekte'
import { ObjektFormular } from '@/teo/arbeitsplatz/objekte/ObjektFormular'

const SPALTEN = 'minmax(0, 2fr) minmax(0, 1fr) 90px 150px'

export function ObjekteListe({
  objekte,
  darfBearbeiten,
  verwaltung,
}: {
  objekte: ApObjektZeile[]
  darfBearbeiten: boolean
  verwaltung: ApPersonKurz[]
}) {
  const [suche, setSuche] = useState('')
  const params = useSearchParams()
  const neu = params.get('neu') === '1'
  // Sofort öffnen/schließen ohne Server-Runde (Next übernimmt history.replaceState in useSearchParams)
  const setNeu = (an: boolean) => window.history.replaceState(null, '', an ? '/arbeitsplatz/objekte?neu=1' : '/arbeitsplatz/objekte')
  const sichtbar = useMemo(() => {
    const s = suche.trim().toLowerCase()
    return s ? objekte.filter((o) => `${o.name} ${o.adresse}`.toLowerCase().includes(s)) : objekte
  }, [objekte, suche])

  return (
    <div>
      <div className="listbar">
        <div className="ap-filterzeile ap-filterzeile--oben">
          <MockInput type="search" placeholder="Suchen" value={suche} onChange={(e) => setSuche(e.target.value)} aria-label="Suchen" />
        </div>
      </div>

      {sichtbar.length === 0 ? (
        <MockEmpty
          icon="building"
          title={objekte.length ? 'Keine Treffer' : 'Noch keine Objekte'}
          action={
            !objekte.length && darfBearbeiten ? (
              <MockBtn kind="primary" sm type="button" onClick={() => setNeu(true)}>
                <MockIcon ctx="btn" n="plus" size={14} />
                <span>Objekt anlegen</span>
              </MockBtn>
            ) : undefined
          }
        />
      ) : (
        <div className="listcard">
          <div className="list-row head" style={{ gridTemplateColumns: SPALTEN }} aria-hidden>
            <div>Objekt</div>
            <div>Zuständig</div>
            <div className="ap-rechts">Offen</div>
            <div className="ap-rechts">Budget</div>
          </div>
          {sichtbar.map((o) => (
            <Link key={o.id} href={`/arbeitsplatz/objekte/${o.id}`} className="list-row" style={{ gridTemplateColumns: SPALTEN }}>
              <div className="ap-zelle-titel">
                <div className="lc-title">{o.name}</div>
                {/* Name ist meist schon die Straße — dann nur PLZ und Ort darunter */}
                {o.adresse ? <div className="lc-sub">{o.adresse.startsWith(o.name) ? o.adresse.slice(o.name.length).replace(/^[\s,]+/, '') || o.adresse : o.adresse}</div> : null}
              </div>
              <div className="lc-desk">{o.zustaendig ?? '—'}</div>
              <div className="lc-desk ap-rechts">{o.offen || '—'}</div>
              <div className={o.budget != null && o.beauftragt > o.budget ? 'lc-desk ap-rechts ap-rot' : 'lc-desk ap-rechts'}>
                {o.budget != null ? `${formatEuro(o.beauftragt)} / ${formatEuro(o.budget)}` : '—'}
              </div>
            </Link>
          ))}
        </div>
      )}

      {neu ? <ObjektFormular open onClose={() => setNeu(false)} objektId={null} start={{ titel: '' }} verwaltung={verwaltung} /> : null}
    </div>
  )
}
