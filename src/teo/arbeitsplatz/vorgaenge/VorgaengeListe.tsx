'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'

import { formatDatum, formatEuro } from '@/lib/shared-domain/geld-datum'
import { MockBadge, MockBtn, MockChip, MockEmpty, MockIcon, MockInput, MockSelect } from '@/teo/arbeitsplatz/kit'
import type { ApVorgangZeile } from '@/teo/arbeitsplatz/daten/vorgaenge'
import { AP_STATUS, AP_STATUS_FILTER, type ApStatus } from '@/teo/arbeitsplatz/vorgang-status'

const SPALTEN = 'minmax(0, 2.4fr) minmax(0, 1.4fr) 110px 110px'
const SPALTEN_OHNE_BETRAG = 'minmax(0, 2.4fr) minmax(0, 1.4fr) 110px'

export function VorgaengeListe({
  vorgaenge,
  objekte,
  zeigeBetrag,
  darfAnlegen,
}: {
  vorgaenge: ApVorgangZeile[]
  objekte: Array<{ id: string; name: string }>
  zeigeBetrag: boolean
  darfAnlegen: boolean
}) {
  const router = useRouter()
  const pfad = usePathname()
  const params = useSearchParams()
  const status = (params.get('status') as ApStatus | null) ?? null
  const objekt = params.get('objekt') ?? ''
  const [suche, setSuche] = useState('')

  function setzen(key: string, wert: string | null) {
    const p = new URLSearchParams(params.toString())
    if (wert) p.set(key, wert)
    else p.delete(key)
    router.replace(`${pfad}${p.toString() ? `?${p}` : ''}`, { scroll: false })
  }

  const zaehler = useMemo(() => {
    const z: Partial<Record<ApStatus, number>> = {}
    for (const v of vorgaenge) if (!objekt || v.objektId === objekt) z[v.status] = (z[v.status] ?? 0) + 1
    return z
  }, [vorgaenge, objekt])

  const sichtbar = useMemo(() => {
    const s = suche.trim().toLowerCase()
    return vorgaenge.filter(
      (v) =>
        (!status || v.status === status) &&
        (!objekt || v.objektId === objekt) &&
        (!s || [v.titel, v.objektName, v.melder].some((t) => t?.toLowerCase().includes(s)))
    )
  }, [vorgaenge, status, objekt, suche])

  const spalten = zeigeBetrag ? SPALTEN : SPALTEN_OHNE_BETRAG

  return (
    <div>
      <div className="listbar">
        <div className="listbar-main">
          <div className="listbar-chips" role="group" aria-label="Status">
            <MockChip active={!status} count={Object.values(zaehler).reduce((a, b) => a + (b ?? 0), 0)} onClick={() => setzen('status', null)}>
              Alle
            </MockChip>
            {AP_STATUS_FILTER.map((s) => (
              <MockChip key={s} active={status === s} count={zaehler[s] ?? 0} onClick={() => setzen('status', status === s ? null : s)}>
                {AP_STATUS[s].label}
              </MockChip>
            ))}
          </div>
          <div className="listbar-actions">
            {darfAnlegen ? (
              <MockBtn kind="primary" sm type="button" onClick={() => router.push('/arbeitsplatz/vorgaenge/neu')}>
                <MockIcon ctx="btn" n="plus" size={14} />
                <span>Neuer Vorgang</span>
              </MockBtn>
            ) : null}
          </div>
        </div>
        <div className="ap-filterzeile">
          <MockInput type="search" placeholder="Suchen" value={suche} onChange={(e) => setSuche(e.target.value)} aria-label="Suchen" />
          {objekte.length > 1 ? (
            <MockSelect value={objekt} onChange={(e) => setzen('objekt', e.target.value || null)} aria-label="Objekt">
              <option value="">Alle Objekte</option>
              {objekte.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </MockSelect>
          ) : null}
        </div>
      </div>

      {sichtbar.length === 0 ? (
        <MockEmpty icon="clipboard-list" title={vorgaenge.length ? 'Keine Treffer' : 'Noch keine Vorgänge'} />
      ) : (
        <div className="listcard">
          <div className="list-row head" style={{ gridTemplateColumns: spalten }} aria-hidden>
            <div>Vorgang</div>
            <div>Objekt</div>
            <div>Datum</div>
            {zeigeBetrag ? <div className="ap-rechts">Betrag</div> : null}
          </div>
          {sichtbar.map((v) => (
            <Link key={v.id} href={`/arbeitsplatz/vorgaenge/${v.id}`} className="list-row" style={{ gridTemplateColumns: spalten }}>
              <div className="ap-zelle-titel">
                <div className="lc-title">{v.titel}</div>
                <div className="lc-pills">
                  <MockBadge kind={AP_STATUS[v.status].badge}>{AP_STATUS[v.status].label}</MockBadge>
                  {v.dringend ? <MockBadge kind="storniert">Dringend</MockBadge> : null}
                </div>
              </div>
              <div className="lc-sub">{v.objektName ?? '—'}</div>
              <div className="lc-desk ap-gedimmt">{formatDatum(v.erstellt)}</div>
              {zeigeBetrag ? <div className="lc-desk ap-rechts">{v.betrag != null ? formatEuro(v.betrag) : '—'}</div> : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
