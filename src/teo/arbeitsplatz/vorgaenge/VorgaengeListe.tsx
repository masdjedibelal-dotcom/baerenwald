'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'

import { formatDatum, formatEuro } from '@/lib/shared-domain/geld-datum'
import { MockBadge, MockChip, MockEmpty, MockInput, MockSelect } from '@/teo/arbeitsplatz/kit'
import type { ApVorgangZeile } from '@/teo/arbeitsplatz/daten/vorgaenge'
import { AP_GRUPPEN, AP_STATUS, apGruppeVon, type ApGruppe, type ApStatus } from '@/teo/arbeitsplatz/vorgang-status'

const SPALTEN = 'minmax(0, 2.4fr) minmax(0, 1.4fr) 110px 110px'
const SPALTEN_OHNE_BETRAG = 'minmax(0, 2.4fr) minmax(0, 1.4fr) 110px'

export function VorgaengeListe({
  vorgaenge,
  objekte,
  meineObjektIds,
  zeigeBetrag,
}: {
  vorgaenge: ApVorgangZeile[]
  objekte: Array<{ id: string; name: string }>
  /** Objekte, für die diese Person zuständig ist (leer = kein „Meine“-Filter) */
  meineObjektIds: string[]
  zeigeBetrag: boolean
}) {
  const router = useRouter()
  const pfad = usePathname()
  const params = useSearchParams()
  // Genauer Stand nur noch über Links (z. B. Startseite „Zu entscheiden“); Chips filtern nach Gruppe
  const status = (params.get('status') as ApStatus | null) ?? null
  const gruppe: ApGruppe = status ? apGruppeVon(status) : ((params.get('gruppe') as ApGruppe | null) ?? 'offen')
  const objekt = params.get('objekt') ?? ''
  const meine = params.get('meine') === '1' && meineObjektIds.length > 0
  const passt = useCallback(
    (v: ApVorgangZeile) => (!objekt || v.objektId === objekt) && (!meine || (v.objektId != null && meineObjektIds.includes(v.objektId))),
    [objekt, meine, meineObjektIds]
  )
  const [suche, setSuche] = useState('')

  function setzen(key: string, wert: string | null) {
    const p = new URLSearchParams(params.toString())
    if (wert) p.set(key, wert)
    else p.delete(key)
    router.replace(`${pfad}${p.toString() ? `?${p}` : ''}`, { scroll: false })
  }

  const zaehler = useMemo(() => {
    const z: Partial<Record<ApGruppe, number>> = {}
    for (const v of vorgaenge) if (passt(v)) z[apGruppeVon(v.status)] = (z[apGruppeVon(v.status)] ?? 0) + 1
    return z
  }, [vorgaenge, passt])

  const sichtbar = useMemo(() => {
    const s = suche.trim().toLowerCase()
    return vorgaenge.filter(
      (v) =>
        (status ? v.status === status : apGruppeVon(v.status) === gruppe) &&
        passt(v) &&
        (!s || [v.titel, v.objektName, v.melder].some((t) => t?.toLowerCase().includes(s)))
    )
  }, [vorgaenge, status, gruppe, passt, suche])

  const spalten = zeigeBetrag ? SPALTEN : SPALTEN_OHNE_BETRAG

  return (
    <div>
      <div className="listbar">
        <div className="listbar-main">
          <div className="listbar-chips" role="group" aria-label="Status">
            {AP_GRUPPEN.map((g) => (
              <MockChip
                key={g.id}
                active={gruppe === g.id}
                count={zaehler[g.id] ?? 0}
                onClick={() => {
                  const p = new URLSearchParams(params.toString())
                  p.delete('status')
                  if (g.id === 'offen') p.delete('gruppe')
                  else p.set('gruppe', g.id)
                  router.replace(`${pfad}${p.toString() ? `?${p}` : ''}`, { scroll: false })
                }}
              >
                {g.label}
              </MockChip>
            ))}
          </div>
        </div>
        <div className="ap-filterzeile">
          {meineObjektIds.length ? (
            <MockChip active={meine} onClick={() => setzen('meine', meine ? null : '1')}>
              Meine Objekte
            </MockChip>
          ) : null}
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
              <div className="lc-sub">{[v.objektName ?? '—', v.einheit].filter(Boolean).join(' · ')}</div>
              <div className="lc-desk ap-gedimmt">{formatDatum(v.erstellt)}</div>
              {zeigeBetrag ? <div className="lc-desk ap-rechts">{v.betrag != null ? formatEuro(v.betrag) : '—'}</div> : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
