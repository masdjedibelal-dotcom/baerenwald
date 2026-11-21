'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { ladeAnfrageFotosHoch } from '@/lib/funnel/fotos-hochladen'
import { MELDE_BEREICHE } from '@/lib/org/melde-bereiche'
import { MELDE_BEREICH_ICON } from '@/lib/org/melde-bereich-icons'
import { MockBtn, MockField, MockIcon, MockInput, MockSelect, MockTextarea } from '@/teo/arbeitsplatz/kit'
import { vorgangAnlegen } from '@/teo/arbeitsplatz/aktionen/vorgang'

const MAX_FOTOS = 8

type Schritt = 'objekt' | 'bereich' | 'details'

/**
 * Neue Anfrage — geführt wie die Mieter-Meldung: Objekt → Was ist betroffen? → Beschreibung & Fotos.
 * Jeder Schritt eine Frage, Kacheln zum Antippen, unten ein Knopf.
 */
export function NeuerVorgang({
  objekte,
  einheiten,
  vorauswahl,
  fertigHref,
}: {
  objekte: Array<{ id: string; name: string }>
  einheiten: Array<{ objektId: string; bezeichnung: string }>
  vorauswahl: string | null
  /** Ziel nach dem Absenden (MeinTEO: /mein); sonst der neue Vorgang im Arbeitsplatz */
  fertigHref?: string
}) {
  const router = useRouter()
  const start = vorauswahl && objekte.some((o) => o.id === vorauswahl) ? vorauswahl : objekte.length === 1 ? objekte[0]!.id : ''
  const [objektId, setObjektId] = useState(start)
  const [schritt, setSchritt] = useState<Schritt>(start ? 'bereich' : 'objekt')
  const [beschreibung, setBeschreibung] = useState('')
  const [bereich, setBereich] = useState('')
  const [einheit, setEinheit] = useState('')
  const einheitenHier = einheiten.filter((e) => e.objektId === objektId)
  const [dringend, setDringend] = useState(false)
  const [kontaktName, setKontaktName] = useState('')
  const [kontaktTelefon, setKontaktTelefon] = useState('')
  const [dateien, setDateien] = useState<File[]>([])
  const [fehler, setFehler] = useState<string | null>(null)
  const [laeuft, starten] = useTransition()
  const objektName = objekte.find((o) => o.id === objektId)?.name ?? ''

  function zurueck() {
    if (schritt === 'details') setSchritt('bereich')
    else if (schritt === 'bereich' && objekte.length > 1) setSchritt('objekt')
    else router.back()
  }

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
      const r = await vorgangAnlegen({ objektId, einheit, bereich, beschreibung, dringend, kontaktName, kontaktTelefon, fotos })
      if (!r.ok) {
        setFehler(r.fehler)
        return
      }
      router.push(fertigHref ?? (r.id ? `/arbeitsplatz/vorgaenge/${r.id}` : '/arbeitsplatz/vorgaenge'))
    })
  }

  const schritte: Schritt[] = objekte.length > 1 ? ['objekt', 'bereich', 'details'] : ['bereich', 'details']
  const nr = schritte.indexOf(schritt) + 1

  return (
    <div className="ap-schmal ap-melden">
      <div className="ap-melden__kopf">
        <MockBtn className="ap-melden__zurueck" type="button" onClick={zurueck} aria-label="Zurück">
          <MockIcon ctx="default" n="chevron-left" size={20} />
        </MockBtn>
        <span className="ap-melden__schritt">
          Schritt {nr} von {schritte.length}
        </span>
      </div>

      {schritt === 'objekt' ? (
        <>
          <h1 className="ap-melden__frage">Welches Haus?</h1>
          <div className="ap-melden__kacheln">
            {objekte.map((o) => (
              <MockBtn
                key={o.id}
                type="button"
                className={o.id === objektId ? 'ap-melden__kachel is-an' : 'ap-melden__kachel'}
                onClick={() => {
                  setObjektId(o.id)
                  setEinheit('')
                  setSchritt('bereich')
                }}
              >
                <span className="ap-melden__icon" aria-hidden>
                  <MockIcon ctx="default" n="building" size={20} />
                </span>
                <span className="ap-melden__label">{o.name}</span>
                <MockIcon ctx="default" n="chevron-right" size={16} />
              </MockBtn>
            ))}
          </div>
        </>
      ) : null}

      {schritt === 'bereich' ? (
        <>
          <h1 className="ap-melden__frage">Was ist betroffen?</h1>
          {objektName ? <p className="ap-melden__unter">{objektName}</p> : null}
          <div className="ap-melden__kacheln">
            {MELDE_BEREICHE.filter((b) => b.id !== 'baum_notfall').map((b) => {
              const Icon = MELDE_BEREICH_ICON[b.id]
              return (
                <MockBtn
                  key={b.id}
                  type="button"
                  className={b.id === bereich ? 'ap-melden__kachel is-an' : 'ap-melden__kachel'}
                  onClick={() => {
                    setBereich(b.id)
                    setSchritt('details')
                  }}
                >
                  <span className="ap-melden__icon" aria-hidden>
                    <Icon size={20} strokeWidth={1.8} />
                  </span>
                  <span className="ap-melden__text">
                    <span className="ap-melden__label">{b.label}</span>
                    <span className="ap-melden__hint">{b.hint}</span>
                  </span>
                </MockBtn>
              )
            })}
          </div>
        </>
      ) : null}

      {schritt === 'details' ? (
        <>
          <h1 className="ap-melden__frage">Was ist passiert?</h1>
          <p className="ap-melden__unter">
            {[objektName, MELDE_BEREICHE.find((b) => b.id === bereich)?.label].filter(Boolean).join(' · ')}
          </p>
          <div className="ap-melden__felder">
            <MockField label="Beschreibung" required full>
              <MockTextarea
                value={beschreibung}
                onChange={(e) => setBeschreibung(e.target.value)}
                rows={4}
                placeholder="Was ist kaputt, seit wann, wo genau?"
              />
            </MockField>
            {einheitenHier.length ? (
              <MockField label="Wohnung / Einheit" full>
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
            <label className="ap-datei">
              <MockIcon ctx="default" n="photo-plus" size={18} />
              <span>{dateien.length ? `${dateien.length} Fotos ausgewählt` : 'Fotos hinzufügen'}</span>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={(e) => setDateien(Array.from(e.target.files ?? []).slice(0, MAX_FOTOS))}
              />
            </label>
            <MockBtn
              type="button"
              className={dringend ? 'ap-melden__schalter is-an' : 'ap-melden__schalter'}
              role="switch"
              aria-checked={dringend}
              onClick={() => setDringend((v) => !v)}
            >
              <span className="ap-melden__label">Dringend</span>
              <span className="ap-melden__schalter-knopf" aria-hidden />
            </MockBtn>
            <div className="ap-melden__zwei">
              <MockField label="Kontakt vor Ort">
                <MockInput value={kontaktName} onChange={(e) => setKontaktName(e.target.value)} placeholder="Name" />
              </MockField>
              <MockField label="Telefon">
                <MockInput value={kontaktTelefon} onChange={(e) => setKontaktTelefon(e.target.value)} type="tel" />
              </MockField>
            </div>
          </div>
          {fehler ? (
            <div className="ap-fehler" role="alert">
              {fehler}
            </div>
          ) : null}
          <div className="ap-melden__fuss">
            <MockBtn
              kind="primary"
              type="button"
              onClick={absenden}
              disabled={laeuft || !objektId || beschreibung.trim().length < 5}
            >
              {laeuft ? 'Wird gesendet …' : 'An TEO geben'}
            </MockBtn>
          </div>
        </>
      ) : null}
    </div>
  )
}
