'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { MockField, MockFormSection, MockInput, MockSelect } from '@/teo/arbeitsplatz/kit'
import { objektSpeichern, type ObjektFelder } from '@/teo/arbeitsplatz/aktionen/objekt'
import type { ApPersonKurz } from '@/teo/arbeitsplatz/daten/objekte'
import { ApSheet } from '@/teo/arbeitsplatz/shell/ApSheet'

export function ObjektFormular({
  open,
  onClose,
  objektId,
  start,
  verwaltung,
}: {
  open: boolean
  onClose: () => void
  /** null = neues Objekt */
  objektId: string | null
  start: ObjektFelder
  verwaltung: ApPersonKurz[]
}) {
  const router = useRouter()
  const [f, setF] = useState<ObjektFelder>(start)
  const [fehler, setFehler] = useState<string | null>(null)
  const [laeuft, starten] = useTransition()
  const feld = (k: keyof ObjektFelder) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))

  function speichern() {
    setFehler(null)
    starten(async () => {
      const r = await objektSpeichern(objektId, f)
      if (!r.ok) {
        setFehler(r.fehler)
        return
      }
      onClose()
      if (!objektId && r.id) router.push(`/arbeitsplatz/objekte/${r.id}`)
      else router.refresh()
    })
  }

  return (
    <ApSheet open={open} titel={objektId ? 'Objekt bearbeiten' : 'Neues Objekt'} onClose={onClose} onSpeichern={speichern} laeuft={laeuft}>
      <MockFormSection title="Objekt">
        <MockField label="Name" required full error={fehler && !f.titel?.trim() ? fehler : undefined}>
          <MockInput value={f.titel} onChange={feld('titel')} placeholder="z. B. WEG Leopoldstraße 10" autoFocus />
        </MockField>
        <MockField label="Straße">
          <MockInput value={f.strasse ?? ''} onChange={feld('strasse')} />
        </MockField>
        <MockField label="Nr.">
          <MockInput value={f.hausnummer ?? ''} onChange={feld('hausnummer')} />
        </MockField>
        <MockField label="PLZ">
          <MockInput value={f.plz ?? ''} onChange={feld('plz')} inputMode="numeric" />
        </MockField>
        <MockField label="Ort">
          <MockInput value={f.ort ?? ''} onChange={feld('ort')} />
        </MockField>
      </MockFormSection>
      <MockFormSection title="Verwaltung">
        <MockField label="Zuständig">
          <MockSelect value={f.zustaendigId ?? ''} onChange={feld('zustaendigId')}>
            <option value="">—</option>
            {verwaltung.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </MockSelect>
        </MockField>
        <MockField label="Budget pro Jahr (€)">
          <MockInput value={String(f.budget ?? '')} onChange={feld('budget')} inputMode="decimal" />
        </MockField>
        <MockField label="Ohne Rückfrage bis (€)">
          <MockInput value={String(f.freigabeSchwelle ?? '')} onChange={feld('freigabeSchwelle')} inputMode="decimal" />
        </MockField>
      </MockFormSection>
      {fehler && f.titel?.trim() ? (
        <div className="ap-fehler" role="alert">
          {fehler}
        </div>
      ) : null}
    </ApSheet>
  )
}
