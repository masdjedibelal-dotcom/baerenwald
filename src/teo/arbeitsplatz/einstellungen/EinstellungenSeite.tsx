'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { MockBtn, MockCard, MockCheckbox, MockField, MockFormSection, MockInput, MockSegment } from '@/teo/arbeitsplatz/kit'
import { einstellungenSpeichern, type EinstellungenFelder } from '@/teo/arbeitsplatz/aktionen/einstellungen'
import { SOFORTMASSNAHME_FAELLE_KATALOG } from '@/teo/hv/sofortmassnahme-faelle'

export function EinstellungenSeite({ start, logoUrl }: { start: EinstellungenFelder; logoUrl: string | null }) {
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

      <LogoKarte logoUrl={logoUrl} />

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

/** Logo der Verwaltung — erscheint auf Aushängen, Schadenunterlagen und Jahresbericht (Farben bleiben im TEO-Look). */
function LogoKarte({ logoUrl }: { logoUrl: string | null }) {
  const router = useRouter()
  const [fehler, setFehler] = useState<string | null>(null)
  const [laeuft, starten] = useTransition()

  function senden(init: RequestInit) {
    setFehler(null)
    starten(async () => {
      const res = await fetch('/arbeitsplatz/einstellungen/logo', init)
      const r = (await res.json().catch(() => ({ ok: false }))) as { ok: boolean; fehler?: string }
      if (!r.ok) setFehler(r.fehler ?? 'Das hat nicht geklappt.')
      else router.refresh()
    })
  }

  function hochladen(datei: File | undefined) {
    if (!datei) return
    const fd = new FormData()
    fd.set('datei', datei)
    senden({ method: 'POST', body: fd })
  }

  return (
    <MockCard title="Logo" icon="photo">
      <p className="ap-hinweis">Erscheint oben auf Aushängen, Schadenunterlagen und dem Jahresbericht. PNG, JPG oder WebP, höchstens 2 MB.</p>
      <div className="ap-logo-zeile">
        <div className="ap-logo-vorschau">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logoUrl ? <img src={logoUrl} alt="Logo" /> : <span>Noch kein Logo</span>}
        </div>
        <div className="ap-knopfzeile">
          <label className="btn secondary sm">
            <span>{laeuft ? 'Lädt …' : logoUrl ? 'Anderes Logo' : 'Logo hochladen'}</span>
            <input type="file" accept="image/png,image/jpeg,image/webp" hidden disabled={laeuft} onChange={(e) => hochladen(e.target.files?.[0])} />
          </label>
          {logoUrl ? (
            <MockBtn kind="ghost" sm type="button" disabled={laeuft} onClick={() => senden({ method: 'DELETE' })}>
              Entfernen
            </MockBtn>
          ) : null}
        </div>
      </div>
      {fehler ? <p className="ap-rot">{fehler}</p> : null}
    </MockCard>
  )
}
