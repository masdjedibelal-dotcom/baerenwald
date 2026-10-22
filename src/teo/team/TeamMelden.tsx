'use client'

import { useState, useTransition } from 'react'

import { ladeAnfrageFotosHoch } from '@/lib/funnel/fotos-hochladen'
import { MockBtn, MockCheckbox, MockField, MockIcon, MockSelect, MockTextarea } from '@/teo/arbeitsplatz/kit'
import { vorgangAnlegen } from '@/teo/arbeitsplatz/aktionen/vorgang'

export function TeamMelden({
  objekte,
  einheiten,
}: {
  objekte: Array<{ id: string; name: string }>
  einheiten: Array<{ objektId: string; bezeichnung: string }>
}) {
  const [objektId, setObjektId] = useState(objekte[0]?.id ?? '')
  const [einheit, setEinheit] = useState('')
  const einheitenHier = einheiten.filter((e) => e.objektId === objektId)
  const [beschreibung, setBeschreibung] = useState('')
  const [dringend, setDringend] = useState(false)
  const [dateien, setDateien] = useState<File[]>([])
  const [fehler, setFehler] = useState<string | null>(null)
  const [fertig, setFertig] = useState(false)
  const [laeuft, starten] = useTransition()

  function absenden() {
    setFehler(null)
    starten(async () => {
      let fotos: string[] = []
      if (dateien.length) {
        try {
          fotos = (await ladeAnfrageFotosHoch(dateien, `team-${objektId}`, 8)).urls
        } catch {
          setFehler('Fotos konnten nicht hochgeladen werden.')
          return
        }
      }
      const r = await vorgangAnlegen({ objektId, einheit, beschreibung, dringend, fotos })
      if (!r.ok) {
        setFehler(r.fehler)
        return
      }
      setFertig(true)
      setBeschreibung('')
      setEinheit('')
      setDringend(false)
      setDateien([])
    })
  }

  if (fertig) {
    return (
      <div className="tm-fertig">
        <MockIcon ctx="default" n="circle-check-filled" size={40} />
        <div className="tm-fertig__titel">Gemeldet</div>
        <MockBtn kind="secondary" type="button" onClick={() => setFertig(false)}>
          Weitere Meldung
        </MockBtn>
      </div>
    )
  }

  return (
    <div className="tm-formular">
      {objekte.length > 1 ? (
        <MockField label="Objekt" required full>
          <MockSelect
            value={objektId}
            onChange={(e) => {
              setObjektId(e.target.value)
              setEinheit('')
            }}
          >
            {objekte.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </MockSelect>
        </MockField>
      ) : null}
      {einheitenHier.length ? (
        <MockField label="Wo genau?" full>
          <MockSelect value={einheit} onChange={(e) => setEinheit(e.target.value)}>
            <option value="">Allgemein / ganzes Haus</option>
            {einheitenHier.map((e) => (
              <option key={e.bezeichnung} value={e.bezeichnung}>
                {e.bezeichnung}
              </option>
            ))}
          </MockSelect>
        </MockField>
      ) : null}
      <MockField label="Was ist passiert?" required full>
        <MockTextarea value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} rows={5} />
      </MockField>
      <label className="ap-datei tm-foto">
        <MockIcon ctx="default" n="camera" size={20} />
        <span>{dateien.length ? `${dateien.length} Foto${dateien.length === 1 ? '' : 's'}` : 'Foto aufnehmen'}</span>
        <input type="file" accept="image/*" capture="environment" multiple onChange={(e) => setDateien(Array.from(e.target.files ?? []).slice(0, 8))} />
      </label>
      <label className="ap-check">
        <MockCheckbox checked={dringend} onChange={() => setDringend((v) => !v)} />
        <span>Dringend</span>
      </label>
      {fehler ? (
        <div className="ap-fehler" role="alert">
          {fehler}
        </div>
      ) : null}
      <MockBtn kind="primary" type="button" className="tm-senden" onClick={absenden} disabled={laeuft || !objektId || beschreibung.trim().length < 5}>
        {laeuft ? 'Wird gesendet …' : 'Melden'}
      </MockBtn>
    </div>
  )
}
