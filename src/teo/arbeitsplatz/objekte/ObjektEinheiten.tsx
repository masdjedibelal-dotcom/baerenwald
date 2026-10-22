'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { MockBtn, MockCard, MockEmpty, MockField, MockFormSection, MockIcon, MockInput, MockTextarea } from '@/teo/arbeitsplatz/kit'
import { einheitEntfernen, einheitSpeichern } from '@/teo/arbeitsplatz/aktionen/haus'
import type { ApEinheit } from '@/teo/arbeitsplatz/daten/einheiten'
import { ApSheet } from '@/teo/arbeitsplatz/shell/ApSheet'

/** Einheiten (optional): Auswahl beim Vorgang anlegen. */
export function ObjektEinheiten({ objektId, einheiten, darfBearbeiten }: { objektId: string; einheiten: ApEinheit[]; darfBearbeiten: boolean }) {
  const [offen, setOffen] = useState<ApEinheit | 'neu' | null>(null)
  if (!einheiten.length && !darfBearbeiten) return null
  return (
    <MockCard
      title={einheiten.length ? `Einheiten (${einheiten.length})` : 'Einheiten'}
      icon="layout"
      actions={
        darfBearbeiten ? (
          <MockBtn kind="ghost" sm type="button" onClick={() => setOffen('neu')}>
            <MockIcon ctx="btn" n="plus" size={14} />
            <span>Einheit</span>
          </MockBtn>
        ) : undefined
      }
    >
      {einheiten.length ? (
        <div className="listcard">
          {einheiten.map((e) => (
            <button
              key={e.id}
              type="button"
              className="list-row ap-zeile-knopf"
              style={{ gridTemplateColumns: '140px minmax(0, 1fr)' }}
              onClick={() => (darfBearbeiten ? setOffen(e) : undefined)}
              disabled={!darfBearbeiten}
            >
              <div className="lc-title">{e.bezeichnung}</div>
              <div className="lc-sub">{[e.lage, e.notiz].filter(Boolean).join(' · ') || '—'}</div>
            </button>
          ))}
        </div>
      ) : (
        <MockEmpty icon="layout" title="Keine Einheiten" />
      )}
      {offen ? <EinheitSheet objektId={objektId} einheit={offen === 'neu' ? null : offen} onClose={() => setOffen(null)} /> : null}
    </MockCard>
  )
}

function EinheitSheet({ objektId, einheit, onClose }: { objektId: string; einheit: ApEinheit | null; onClose: () => void }) {
  const router = useRouter()
  const [bezeichnung, setBezeichnung] = useState(einheit?.bezeichnung ?? '')
  const [lage, setLage] = useState(einheit?.lage ?? '')
  const [notiz, setNotiz] = useState(einheit?.notiz ?? '')
  const [fehler, setFehler] = useState<string | null>(null)
  const [laeuft, starten] = useTransition()

  function los(fn: () => Promise<{ ok: true } | { ok: false; fehler: string }>) {
    setFehler(null)
    starten(async () => {
      const r = await fn()
      if (!r.ok) return setFehler(r.fehler)
      onClose()
      router.refresh()
    })
  }

  return (
    <ApSheet
      open
      titel={einheit ? 'Einheit bearbeiten' : 'Neue Einheit'}
      onClose={onClose}
      onSpeichern={() => los(() => einheitSpeichern(objektId, einheit?.id ?? null, { bezeichnung, lage, notiz }))}
      gefahr={einheit ? { label: 'Entfernen', onClick: () => los(() => einheitEntfernen(objektId, einheit.id)) } : undefined}
      laeuft={laeuft}
    >
      <MockFormSection title="Einheit">
        <MockField label="Bezeichnung" required>
          <MockInput value={bezeichnung} onChange={(e) => setBezeichnung(e.target.value)} placeholder="z. B. WE 3" autoFocus />
        </MockField>
        <MockField label="Lage">
          <MockInput value={lage} onChange={(e) => setLage(e.target.value)} placeholder="z. B. 2. OG links" />
        </MockField>
        <MockField label="Notiz" full>
          <MockTextarea value={notiz} onChange={(e) => setNotiz(e.target.value)} rows={3} />
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
