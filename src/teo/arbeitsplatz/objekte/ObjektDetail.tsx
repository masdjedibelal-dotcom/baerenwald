'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'

import { formatDatum, formatEuro } from '@/lib/shared-domain/geld-datum'
import {
  MockBadge,
  MockBtn,
  MockCard,
  MockEmpty,
  MockField,
  MockFormSection,
  MockIcon,
  MockInput,
  MockProp,
  MockSelect,
  MockTabs,
  MockTextarea,
} from '@/teo/arbeitsplatz/kit'
import { kontaktEntfernen, kontaktSpeichern, type KontaktFelder } from '@/teo/arbeitsplatz/aktionen/objekt'
import type { ApKontakt, ApObjektDetail } from '@/teo/arbeitsplatz/daten/objekte'
import { KONTAKT_ROLLE_LABEL, KONTAKT_ROLLEN } from '@/teo/arbeitsplatz/objekt-felder'
import { ObjektFormular } from '@/teo/arbeitsplatz/objekte/ObjektFormular'
import { ROLLEN_LABEL, type ApRolle } from '@/teo/arbeitsplatz/rechte'
import { ApSheet } from '@/teo/arbeitsplatz/shell/ApSheet'
import { AP_STATUS } from '@/teo/arbeitsplatz/vorgang-status'

type Rechte = { bearbeiten: boolean; kosten: boolean; vorgangAnlegen: boolean }

export function ObjektDetail({ d, rechte }: { d: ApObjektDetail; rechte: Rechte }) {
  const router = useRouter()
  const { objekt } = d
  const [tab, setTab] = useState('uebersicht')
  const [bearbeiten, setBearbeiten] = useState(false)
  const [kontakt, setKontakt] = useState<ApKontakt | 'neu' | null>(null)
  const [herkunft, setHerkunft] = useState('')
  const [kopiert, setKopiert] = useState(false)
  useEffect(() => setHerkunft(window.location.origin), [])

  const offen = d.vorgaenge.filter((v) => v.status !== 'erledigt' && v.status !== 'abgelehnt')
  const rest = objekt.budget != null ? objekt.budget - d.beauftragt : null
  const meldeUrl = objekt.meldeLink && herkunft ? `${herkunft}${objekt.meldeLink}` : null

  const tabs = [
    { id: 'uebersicht', label: 'Übersicht', icon: 'layout' },
    { id: 'vorgaenge', label: 'Vorgänge', icon: 'clipboard-list', count: offen.length || undefined },
    { id: 'kontakte', label: 'Kontakte', icon: 'phone', count: d.kontakte.length || undefined },
    { id: 'personen', label: 'Personen', icon: 'users', count: d.zugeordnet.length || undefined },
  ]

  return (
    <div className="detail-entity-page">
      <header className="detail-head detail-head--project">
        <div className="detail-head-main vgid min-w-0 flex-1">
          <div className="dh-titlerow">
            <div className="dh-title vgid-name">{objekt.name}</div>
          </div>
          <div className="dh-meta vgid-meta">
            <span>{objekt.adresse || '—'}</span>
          </div>
        </div>
        <div className="detail-head-actions min-w-0">
          {rechte.bearbeiten ? (
            <MockBtn kind="secondary" sm type="button" onClick={() => setBearbeiten(true)}>
              Bearbeiten
            </MockBtn>
          ) : null}
          {rechte.vorgangAnlegen ? (
            <MockBtn kind="primary" sm type="button" onClick={() => router.push(`/arbeitsplatz/vorgaenge/neu?objekt=${objekt.id}`)}>
              <MockIcon ctx="btn" n="plus" size={14} />
              <span>Vorgang</span>
            </MockBtn>
          ) : null}
        </div>
      </header>

      <div className="dshell">
        <MockTabs items={tabs} value={tab} onChange={setTab} aria-label="Bereiche" className="dshell-nav" tabClassName="dshell-navitem" iconCtx="nav" />
        <div className="dshell-body">
          <div className="dshell-group active">
            <div className="dshell-cards">
              {tab === 'uebersicht' ? (
                <>
                  <MockCard title="Objekt" icon="building">
                    <div className="props">
                      <MockProp label="Adresse">{objekt.adresse || '—'}</MockProp>
                      <MockProp label="Zuständig">{d.verwaltung.find((p) => p.id === objekt.zustaendigId)?.name ?? '—'}</MockProp>
                      <MockProp label="Ohne Rückfrage bis">{objekt.freigabeSchwelle != null ? formatEuro(objekt.freigabeSchwelle) : '—'}</MockProp>
                      <MockProp label="Offene Vorgänge">{offen.length}</MockProp>
                    </div>
                  </MockCard>
                  {rechte.kosten ? (
                    <MockCard
                      title={`Kosten ${d.jahr}`}
                      icon="euro"
                      actions={
                        <a className="btn ghost sm" href={`/arbeitsplatz/objekte/${objekt.id}/kosten`} download>
                          <MockIcon ctx="btn" n="download" size={14} />
                          <span>Exportieren</span>
                        </a>
                      }
                    >
                      <div className="props">
                        <MockProp label="Budget">{objekt.budget != null ? formatEuro(objekt.budget) : '—'}</MockProp>
                        <MockProp label="Beauftragt">{formatEuro(d.beauftragt)}</MockProp>
                        {rest != null ? (
                          <MockProp label="Noch frei">
                            <span className={rest < 0 ? 'ap-rot' : undefined}>{formatEuro(rest)}</span>
                          </MockProp>
                        ) : null}
                        <MockProp label="Abgerechnet">{formatEuro(d.abgerechnet)}</MockProp>
                      </div>
                    </MockCard>
                  ) : null}
                  {meldeUrl ? (
                    <MockCard title="Melde-Link für Mieter" icon="link">
                      <div className="ap-melde">
                        <code className="ap-melde__url">{meldeUrl}</code>
                        <div className="ap-knopfzeile">
                          <MockBtn
                            kind="secondary"
                            sm
                            type="button"
                            onClick={() => {
                              void navigator.clipboard.writeText(meldeUrl).then(() => {
                                setKopiert(true)
                                window.setTimeout(() => setKopiert(false), 1800)
                              })
                            }}
                          >
                            <MockIcon ctx="btn" n={kopiert ? 'check' : 'copy'} size={14} />
                            <span>{kopiert ? 'Kopiert' : 'Kopieren'}</span>
                          </MockBtn>
                          <a className="btn secondary sm" href={`/api/org/melde-aushang?objektId=${objekt.id}`} target="_blank" rel="noreferrer">
                            <MockIcon ctx="btn" n="file-text" size={14} />
                            <span>Aushang</span>
                          </a>
                        </div>
                      </div>
                    </MockCard>
                  ) : null}
                </>
              ) : null}

              {tab === 'vorgaenge' ? (
                d.vorgaenge.length ? (
                  <div className="listcard">
                    {d.vorgaenge.map((v) => (
                      <Link key={v.id} href={`/arbeitsplatz/vorgaenge/${v.id}`} className="list-row" style={{ gridTemplateColumns: rechte.kosten ? 'minmax(0, 2fr) 110px 110px' : 'minmax(0, 2fr) 110px' }}>
                        <div className="ap-zelle-titel">
                          <div className="lc-title">{v.titel}</div>
                          <div className="lc-pills">
                            <MockBadge kind={AP_STATUS[v.status].badge}>{AP_STATUS[v.status].label}</MockBadge>
                          </div>
                        </div>
                        <div className="lc-desk ap-gedimmt">{formatDatum(v.erstellt)}</div>
                        {rechte.kosten ? <div className="lc-desk ap-rechts">{v.betrag != null ? formatEuro(v.betrag) : '—'}</div> : null}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <MockEmpty icon="clipboard-list" title="Noch keine Vorgänge" />
                )
              ) : null}

              {tab === 'kontakte' ? (
                <MockCard
                  title="Kontakte"
                  icon="phone"
                  actions={
                    rechte.bearbeiten ? (
                      <MockBtn kind="ghost" sm type="button" onClick={() => setKontakt('neu')}>
                        <MockIcon ctx="btn" n="plus" size={14} />
                        <span>Kontakt</span>
                      </MockBtn>
                    ) : undefined
                  }
                >
                  {d.kontakte.length ? (
                    <div className="listcard">
                      {d.kontakte.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="list-row ap-zeile-knopf"
                          style={{ gridTemplateColumns: '130px minmax(0, 1fr) minmax(0, 1fr)' }}
                          onClick={() => (rechte.bearbeiten ? setKontakt(c) : undefined)}
                          disabled={!rechte.bearbeiten}
                        >
                          <div className="lc-pills">
                            <MockBadge kind="plain">{KONTAKT_ROLLE_LABEL[c.rolle as keyof typeof KONTAKT_ROLLE_LABEL] ?? c.rolle}</MockBadge>
                          </div>
                          <div className="lc-title">{c.name}</div>
                          <div className="lc-sub">{[c.telefon, c.email].filter(Boolean).join(' · ') || '—'}</div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <MockEmpty icon="phone" title="Noch keine Kontakte" />
                  )}
                </MockCard>
              ) : null}

              {tab === 'personen' ? (
                d.zugeordnet.length ? (
                  <div className="listcard">
                    {d.zugeordnet.map((p) => (
                      <div key={p.id} className="list-row" style={{ gridTemplateColumns: 'minmax(0, 1fr) 140px' }}>
                        <div className="lc-title">{p.name}</div>
                        <div className="lc-pills">
                          <MockBadge kind="plain">{ROLLEN_LABEL[p.rolle as ApRolle] ?? p.rolle}</MockBadge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <MockEmpty icon="users" title="Noch niemand zugeordnet" />
                )
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {bearbeiten ? (
        <ObjektFormular
          open
          onClose={() => setBearbeiten(false)}
          objektId={objekt.id}
          verwaltung={d.verwaltung}
          start={{
            titel: objekt.name,
            strasse: objekt.strasse ?? '',
            hausnummer: objekt.hausnummer ?? '',
            plz: objekt.plz ?? '',
            ort: objekt.ort ?? '',
            budget: objekt.budget ?? '',
            freigabeSchwelle: objekt.freigabeSchwelle ?? '',
            zustaendigId: objekt.zustaendigId,
          }}
        />
      ) : null}
      {kontakt ? <KontaktSheet objektId={objekt.id} kontakt={kontakt === 'neu' ? null : kontakt} onClose={() => setKontakt(null)} /> : null}
    </div>
  )
}

function KontaktSheet({ objektId, kontakt, onClose }: { objektId: string; kontakt: ApKontakt | null; onClose: () => void }) {
  const router = useRouter()
  const [f, setF] = useState<KontaktFelder>({
    rolle: kontakt?.rolle ?? 'ansprechpartner',
    name: kontakt?.name ?? '',
    telefon: kontakt?.telefon ?? '',
    email: kontakt?.email ?? '',
    notiz: kontakt?.notiz ?? '',
  })
  const [fehler, setFehler] = useState<string | null>(null)
  const [laeuft, starten] = useTransition()
  const feld = (k: keyof KontaktFelder) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))

  function los(fn: () => ReturnType<typeof kontaktEntfernen>) {
    setFehler(null)
    starten(async () => {
      const r = await fn()
      if (!r.ok) {
        setFehler(r.fehler)
        return
      }
      onClose()
      router.refresh()
    })
  }

  return (
    <ApSheet
      open
      titel={kontakt ? 'Kontakt bearbeiten' : 'Neuer Kontakt'}
      onClose={onClose}
      onSpeichern={() => los(() => kontaktSpeichern(objektId, kontakt?.id ?? null, f))}
      gefahr={kontakt ? { label: 'Entfernen', onClick: () => los(() => kontaktEntfernen(objektId, kontakt.id)) } : undefined}
      laeuft={laeuft}
    >
      <MockFormSection title="Kontakt">
        <MockField label="Rolle">
          <MockSelect value={f.rolle} onChange={feld('rolle')}>
            {KONTAKT_ROLLEN.map((r) => (
              <option key={r} value={r}>
                {KONTAKT_ROLLE_LABEL[r]}
              </option>
            ))}
          </MockSelect>
        </MockField>
        <MockField label="Name" required>
          <MockInput value={f.name} onChange={feld('name')} autoFocus />
        </MockField>
        <MockField label="Telefon">
          <MockInput value={f.telefon ?? ''} onChange={feld('telefon')} type="tel" />
        </MockField>
        <MockField label="E-Mail">
          <MockInput value={f.email ?? ''} onChange={feld('email')} type="email" />
        </MockField>
        <MockField label="Notiz" full>
          <MockTextarea value={f.notiz ?? ''} onChange={feld('notiz')} rows={3} />
        </MockField>
      </MockFormSection>
      {fehler ? (
        <div className="ap-fehler" role="alert">
          {fehler}
        </div>
      ) : null}
    </ApSheet>
  )
}
