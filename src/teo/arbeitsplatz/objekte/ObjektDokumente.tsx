'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { formatDatum } from '@/lib/shared-domain/geld-datum'
import { MockBadge, MockBtn, MockCard, MockCheckbox, MockEmpty, MockField, MockFormSection, MockIcon, MockInput } from '@/teo/arbeitsplatz/kit'
import { dokumentAendern, dokumentEntfernen } from '@/teo/arbeitsplatz/aktionen/haus'
import type { ApDokument } from '@/teo/arbeitsplatz/daten/haus'
import { ApSheet } from '@/teo/arbeitsplatz/shell/ApSheet'

export function ObjektDokumente({ objektId, dokumente, darfHochladen }: { objektId: string; dokumente: ApDokument[]; darfHochladen: boolean }) {
  const [offen, setOffen] = useState<ApDokument | 'neu' | null>(null)
  return (
    <MockCard
      title="Dokumente"
      icon="files"
      actions={
        darfHochladen ? (
          <MockBtn kind="ghost" sm type="button" onClick={() => setOffen('neu')}>
            <MockIcon ctx="btn" n="upload" size={14} />
            <span>Hochladen</span>
          </MockBtn>
        ) : undefined
      }
    >
      {dokumente.length ? (
        <div className="listcard">
          {dokumente.map((d) => (
            <div key={d.id} className="list-row" style={{ gridTemplateColumns: 'minmax(0, 1fr) 110px auto' }}>
              <a className="ap-zelle-titel" href={d.url} target="_blank" rel="noreferrer">
                <div className="lc-title">{d.name}</div>
                {d.fuerBewohner ? (
                  <div className="lc-pills">
                    <MockBadge kind="plain">Für Bewohner</MockBadge>
                  </div>
                ) : null}
              </a>
              <div className="lc-desk ap-gedimmt">{formatDatum(d.datum)}</div>
              {darfHochladen ? (
                <MockBtn kind="ghost" sm type="button" aria-label="Bearbeiten" onClick={() => setOffen(d)}>
                  <MockIcon ctx="btn" n="pencil" size={14} />
                </MockBtn>
              ) : (
                <span />
              )}
            </div>
          ))}
        </div>
      ) : (
        <MockEmpty icon="files" title="Noch keine Dokumente" />
      )}
      {offen ? <DokumentSheet objektId={objektId} dokument={offen === 'neu' ? null : offen} onClose={() => setOffen(null)} /> : null}
    </MockCard>
  )
}

function DokumentSheet({ objektId, dokument, onClose }: { objektId: string; dokument: ApDokument | null; onClose: () => void }) {
  const router = useRouter()
  const [name, setName] = useState(dokument?.name ?? '')
  const [fuerBewohner, setFuerBewohner] = useState(dokument?.fuerBewohner ?? false)
  const [datei, setDatei] = useState<File | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [laeuft, starten] = useTransition()

  function speichern() {
    setFehler(null)
    starten(async () => {
      if (dokument) {
        const r = await dokumentAendern(objektId, dokument.id, { name, fuerBewohner })
        if (!r.ok) return setFehler(r.fehler)
      } else {
        if (!datei) return setFehler('Bitte eine Datei wählen.')
        const fd = new FormData()
        fd.set('datei', datei)
        fd.set('name', name)
        fd.set('fuerBewohner', fuerBewohner ? '1' : '0')
        const res = await fetch(`/arbeitsplatz/objekte/${objektId}/dokumente`, { method: 'POST', body: fd })
        const j = (await res.json().catch(() => ({}))) as { ok?: boolean; fehler?: string }
        if (!res.ok || !j.ok) return setFehler(j.fehler ?? 'Hochladen fehlgeschlagen.')
      }
      onClose()
      router.refresh()
    })
  }

  function entfernen() {
    if (!dokument) return
    starten(async () => {
      const r = await dokumentEntfernen(objektId, dokument.id)
      if (!r.ok) return setFehler(r.fehler)
      onClose()
      router.refresh()
    })
  }

  return (
    <ApSheet
      open
      titel={dokument ? 'Dokument' : 'Dokument hochladen'}
      onClose={onClose}
      onSpeichern={speichern}
      speichernLabel={dokument ? 'Speichern' : 'Hochladen'}
      gefahr={dokument ? { label: 'Entfernen', onClick: entfernen } : undefined}
      laeuft={laeuft}
    >
      <MockFormSection title="Dokument">
        {!dokument ? (
          <MockField full>
            <label className="ap-datei">
              <MockIcon ctx="default" n="paperclip" size={18} />
              <span>{datei ? datei.name : 'Datei wählen (PDF oder Bild)'}</span>
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null
                  setDatei(f)
                  if (f && !name) setName(f.name.replace(/\.[a-z0-9]+$/i, ''))
                }}
              />
            </label>
          </MockField>
        ) : null}
        <MockField label="Name" full>
          <MockInput value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Hausordnung" />
        </MockField>
        <label className="ap-check">
          <MockCheckbox checked={fuerBewohner} onChange={() => setFuerBewohner((v) => !v)} />
          <span>Für Mieter und Eigentümer sichtbar</span>
        </label>
      </MockFormSection>
      {fehler ? (
        <div className="ap-fehler" role="alert">
          {fehler}
        </div>
      ) : null}
    </ApSheet>
  )
}
