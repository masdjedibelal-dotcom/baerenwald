'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { ladeAnfrageFotosHoch } from '@/lib/funnel/fotos-hochladen'
import { MockBtn, MockCard, MockCheckbox, MockField, MockFormSection, MockIcon, MockInput, MockSelect, MockTextarea } from '@/teo/arbeitsplatz/kit'
import { vorgangAnlegen } from '@/teo/arbeitsplatz/aktionen/vorgang'

const MAX_FOTOS = 8

export function NeuerVorgang({ objekte, vorauswahl }: { objekte: Array<{ id: string; name: string }>; vorauswahl: string | null }) {
  const router = useRouter()
  const [objektId, setObjektId] = useState(vorauswahl && objekte.some((o) => o.id === vorauswahl) ? vorauswahl : objekte[0]?.id ?? '')
  const [beschreibung, setBeschreibung] = useState('')
  const [dringend, setDringend] = useState(false)
  const [kontaktName, setKontaktName] = useState('')
  const [kontaktTelefon, setKontaktTelefon] = useState('')
  const [dateien, setDateien] = useState<File[]>([])
  const [fehler, setFehler] = useState<string | null>(null)
  const [laeuft, starten] = useTransition()

  function absenden() {
    setFehler(null)
    starten(async () => {
      let fotos: string[] = []
      if (dateien.length) {
        try {
          fotos = (await ladeAnfrageFotosHoch(dateien, `arbeitsplatz-${objektId}`, MAX_FOTOS)).urls
        } catch {
          setFehler('Fotos konnten nicht hochgeladen werden.')
          return
        }
      }
      const r = await vorgangAnlegen({ objektId, beschreibung, dringend, kontaktName, kontaktTelefon, fotos })
      if (!r.ok) {
        setFehler(r.fehler)
        return
      }
      router.push(r.id ? `/arbeitsplatz/vorgaenge/${r.id}` : '/arbeitsplatz/vorgaenge')
    })
  }

  return (
    <div className="ap-schmal">
      <MockCard title="Neuer Vorgang" icon="clipboard-list">
        <MockFormSection>
          <MockField label="Objekt" required full>
            <MockSelect value={objektId} onChange={(e) => setObjektId(e.target.value)}>
              {objekte.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </MockSelect>
          </MockField>
          <MockField label="Was ist zu tun?" required full>
            <MockTextarea value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} rows={5} autoFocus />
          </MockField>
          <MockField label="Kontakt vor Ort">
            <MockInput value={kontaktName} onChange={(e) => setKontaktName(e.target.value)} placeholder="Name" />
          </MockField>
          <MockField label="Telefon">
            <MockInput value={kontaktTelefon} onChange={(e) => setKontaktTelefon(e.target.value)} type="tel" />
          </MockField>
          <label className="ap-check">
            <MockCheckbox checked={dringend} onChange={() => setDringend((v) => !v)} />
            <span>Dringend</span>
          </label>
          <MockField label="Fotos" full>
            <label className="ap-datei">
              <MockIcon ctx="default" n="photo-plus" size={18} />
              <span>{dateien.length ? `${dateien.length} ausgewählt` : 'Fotos auswählen'}</span>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={(e) => setDateien(Array.from(e.target.files ?? []).slice(0, MAX_FOTOS))}
              />
            </label>
          </MockField>
        </MockFormSection>
        {fehler ? (
          <div className="ap-fehler" role="alert">
            {fehler}
          </div>
        ) : null}
        <div className="ap-knopfzeile">
          <MockBtn kind="secondary" type="button" onClick={() => router.back()} disabled={laeuft}>
            Abbrechen
          </MockBtn>
          <MockBtn kind="primary" type="button" onClick={absenden} disabled={laeuft || !objektId || beschreibung.trim().length < 5}>
            {laeuft ? 'Wird gesendet …' : 'An TEO geben'}
          </MockBtn>
        </div>
      </MockCard>
    </div>
  )
}
