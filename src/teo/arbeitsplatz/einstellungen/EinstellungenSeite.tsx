'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { MockBtn, MockCard, MockCheckbox, MockField, MockFormSection, MockInput, MockSegment } from '@/teo/arbeitsplatz/kit'
import { einstellungenSpeichern, type EinstellungenFelder } from '@/teo/arbeitsplatz/aktionen/einstellungen'
import { SOFORTMASSNAHME_FAELLE_KATALOG } from '@/teo/hv/sofortmassnahme-faelle'

export function EinstellungenSeite({ start }: { start: EinstellungenFelder }) {
  const router = useRouter()
  const [f, setF] = useState(start)
  const [meldung, setMeldung] = useState<{ ok: boolean; text: string } | null>(null)
  const [laeuft, starten] = useTransition()
  const bereiche = [...new Set(SOFORTMASSNAHME_FAELLE_KATALOG.map((x) => x.bereich))]
  const geaendert = JSON.stringify(f) !== JSON.stringify(start)

  function speichern() {
    setMeldung(null)
    starten(async () => {
      const r = await einstellungenSpeichern(f)
      setMeldung(r.ok ? { ok: true, text: 'Gespeichert' } : { ok: false, text: r.fehler })
      if (r.ok) router.refresh()
    })
  }

  const akut = (id: string) =>
    setF((x) => ({ ...x, akutFallIds: x.akutFallIds.includes(id) ? x.akutFallIds.filter((a) => a !== id) : [...x.akutFallIds, id] }))

  return (
    <div className="ap-schmal ap-start">
      <MockCard title="Organisation" icon="building">
        <MockFormSection>
          <MockField label="Name" full>
            <MockInput value={f.anzeigename} onChange={(e) => setF((x) => ({ ...x, anzeigename: e.target.value }))} />
          </MockField>
          <MockField label="Art" full>
            <MockSegment
              value={f.orgTyp}
              onChange={(v) => setF((x) => ({ ...x, orgTyp: v }))}
              options={[
                { value: 'hv', label: 'Hausverwaltung' },
                { value: 'weg', label: 'Selbstverwaltete WEG' },
              ]}
            />
          </MockField>
        </MockFormSection>
      </MockCard>

      <MockCard title="Freigaben" icon="shield-check">
        <MockFormSection>
          <MockField label="Ohne Rückfrage bis (€)">
            <MockInput value={f.freigabeSchwelle} onChange={(e) => setF((x) => ({ ...x, freigabeSchwelle: e.target.value }))} inputMode="decimal" />
          </MockField>
        </MockFormSection>
      </MockCard>

      <MockCard title="Sofort an TEO (ohne Rückfrage)" icon="alert-triangle">
        {bereiche.map((b) => (
          <div key={b} className="ap-gruppe">
            <div className="form-section-h">{b}</div>
            {SOFORTMASSNAHME_FAELLE_KATALOG.filter((x) => x.bereich === b).map((x) => (
              <label key={x.id} className="ap-check">
                <MockCheckbox checked={f.akutFallIds.includes(x.id)} onChange={() => akut(x.id)} />
                <span>{x.label}</span>
              </label>
            ))}
          </div>
        ))}
      </MockCard>

      <MockCard title="Rechtstexte für den Melde-Link" icon="file-text">
        <MockFormSection>
          <MockField label="Impressum (Link)" full>
            <MockInput value={f.impressumUrl} onChange={(e) => setF((x) => ({ ...x, impressumUrl: e.target.value }))} placeholder="https://" />
          </MockField>
          <MockField label="Datenschutz (Link)" full>
            <MockInput value={f.datenschutzUrl} onChange={(e) => setF((x) => ({ ...x, datenschutzUrl: e.target.value }))} placeholder="https://" />
          </MockField>
        </MockFormSection>
      </MockCard>

      <div className="ap-knopfzeile ap-knopfzeile--fuss">
        {meldung ? <span className={meldung.ok ? 'ap-ok' : 'ap-rot'}>{meldung.text}</span> : null}
        <MockBtn kind="primary" type="button" onClick={speichern} disabled={laeuft || !geaendert}>
          {laeuft ? 'Speichert …' : 'Speichern'}
        </MockBtn>
      </div>
    </div>
  )
}
