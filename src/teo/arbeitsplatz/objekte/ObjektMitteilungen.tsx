'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { formatDatum } from '@/lib/shared-domain/geld-datum'
import { MockBadge, MockBtn, MockCard, MockEmpty, MockField, MockFormSection, MockIcon, MockInput, MockTextarea } from '@/teo/arbeitsplatz/kit'
import { mitteilungEntfernen, mitteilungSpeichern } from '@/teo/arbeitsplatz/aktionen/haus'
import type { ApMitteilung } from '@/teo/arbeitsplatz/daten/haus'
import { heute } from '@/teo/arbeitsplatz/plaene/plan-logik'
import { ApSheet } from '@/teo/arbeitsplatz/shell/ApSheet'

/** Mitteilung ans Haus: erscheint auf dem Melde-Link (QR), in MeinTEO und als Aushang. */
export function ObjektMitteilungen({ objektId, mitteilungen, darfBearbeiten }: { objektId: string; mitteilungen: ApMitteilung[]; darfBearbeiten: boolean }) {
  const [offen, setOffen] = useState<ApMitteilung | 'neu' | null>(null)
  const h = heute()
  return (
    <MockCard
      title="Mitteilungen ans Haus"
      icon="messages"
      actions={
        darfBearbeiten ? (
          <MockBtn kind="ghost" sm type="button" onClick={() => setOffen('neu')}>
            <MockIcon ctx="btn" n="plus" size={14} />
            <span>Mitteilung</span>
          </MockBtn>
        ) : undefined
      }
    >
      {mitteilungen.length ? (
        <ol className="ap-verlauf">
          {mitteilungen.map((m) => {
            const abgelaufen = Boolean(m.gueltigBis && m.gueltigBis < h)
            return (
              <li key={m.id}>
                <div className="ap-verlauf__kopf">
                  <span className="ap-verlauf__titel">
                    {m.titel} {abgelaufen ? <MockBadge kind="plain">Abgelaufen</MockBadge> : null}
                  </span>
                  <span className="ap-gedimmt">{formatDatum(m.erstellt)}</span>
                </div>
                {m.text ? <div className="ap-verlauf__text">{m.text}</div> : null}
                <div className="ap-knopfzeile ap-knopfzeile--links">
                  <a className="ap-link" href={`/aushang/${m.id}`} target="_blank" rel="noreferrer">
                    Aushang drucken
                  </a>
                  {darfBearbeiten ? (
                    <button type="button" className="ap-link" onClick={() => setOffen(m)}>
                      Bearbeiten
                    </button>
                  ) : null}
                  {m.gueltigBis ? <span className="ap-gedimmt">bis {formatDatum(m.gueltigBis)}</span> : null}
                </div>
              </li>
            )
          })}
        </ol>
      ) : (
        <MockEmpty icon="messages" title="Keine Mitteilungen" />
      )}
      {offen ? <MitteilungSheet objektId={objektId} mitteilung={offen === 'neu' ? null : offen} onClose={() => setOffen(null)} /> : null}
    </MockCard>
  )
}

function MitteilungSheet({ objektId, mitteilung, onClose }: { objektId: string; mitteilung: ApMitteilung | null; onClose: () => void }) {
  const router = useRouter()
  const [titel, setTitel] = useState(mitteilung?.titel ?? '')
  const [text, setText] = useState(mitteilung?.text ?? '')
  const [gueltigBis, setGueltigBis] = useState(mitteilung?.gueltigBis ?? '')
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
      titel={mitteilung ? 'Mitteilung bearbeiten' : 'Neue Mitteilung'}
      onClose={onClose}
      onSpeichern={() => los(() => mitteilungSpeichern(objektId, mitteilung?.id ?? null, { titel, text, gueltigBis }))}
      speichernLabel={mitteilung ? 'Speichern' : 'Veröffentlichen'}
      gefahr={mitteilung ? { label: 'Entfernen', onClick: () => los(() => mitteilungEntfernen(objektId, mitteilung.id)) } : undefined}
      laeuft={laeuft}
    >
      <MockFormSection title="Mitteilung">
        <MockField label="Überschrift" required full>
          <MockInput value={titel} onChange={(e) => setTitel(e.target.value)} placeholder="z. B. Wasser am 5.11. abgestellt" autoFocus />
        </MockField>
        <MockField label="Text" full>
          <MockTextarea value={text} onChange={(e) => setText(e.target.value)} rows={6} />
        </MockField>
        <MockField label="Anzeigen bis">
          <MockInput type="date" value={gueltigBis} onChange={(e) => setGueltigBis(e.target.value)} />
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
