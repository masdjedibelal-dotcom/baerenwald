'use client'

import { useState, useTransition } from 'react'

import { ladeAnfrageFotosHoch } from '@/lib/funnel/fotos-hochladen'
import { MockBtn, MockIcon, MockTextarea } from '@/teo/arbeitsplatz/kit'
import { planAbhaken } from '@/teo/arbeitsplatz/aktionen/plaene'
import type { ApPlan } from '@/teo/arbeitsplatz/daten/plaene'

/** Checkliste abhaken — große ✓/✗, Foto, Notiz. Für Arbeitsplatz und Team-App. */
export function PlanAbhaken({ plan, onFertig }: { plan: ApPlan; onFertig: (vorgangId?: string) => void }) {
  const [ok, setOk] = useState<Record<string, boolean>>(() => Object.fromEntries(plan.checkliste.map((c) => [c.id, true])))
  const [notiz, setNotiz] = useState('')
  const [dateien, setDateien] = useState<File[]>([])
  const [fehler, setFehler] = useState<string | null>(null)
  const [laeuft, starten] = useTransition()
  const maengel = plan.checkliste.filter((c) => ok[c.id] === false).length

  function fertig() {
    setFehler(null)
    starten(async () => {
      let fotos: string[] = []
      if (dateien.length) {
        try {
          fotos = (await ladeAnfrageFotosHoch(dateien, `plan-${plan.id}`, 8)).urls
        } catch {
          setFehler('Fotos konnten nicht hochgeladen werden.')
          return
        }
      }
      const r = await planAbhaken(plan.id, { punkte: plan.checkliste.map((c) => ({ id: c.id, ok: ok[c.id] !== false })), notiz, fotos })
      if (!r.ok) {
        setFehler(r.fehler)
        return
      }
      onFertig(r.vorgangId)
    })
  }

  return (
    <div className="ap-abhaken">
      {plan.checkliste.length ? (
        <ul className="ap-abhaken__liste">
          {plan.checkliste.map((c) => (
            <li key={c.id} className={ok[c.id] === false ? 'ap-abhaken__punkt is-mangel' : 'ap-abhaken__punkt'}>
              <span className="ap-abhaken__text">{c.text}</span>
              <span className="ap-abhaken__wahl">
                <button type="button" className={ok[c.id] !== false ? 'ap-ja is-an' : 'ap-ja'} aria-label="In Ordnung" onClick={() => setOk((x) => ({ ...x, [c.id]: true }))}>
                  <MockIcon ctx="btn" n="check" size={20} />
                </button>
                <button type="button" className={ok[c.id] === false ? 'ap-nein is-an' : 'ap-nein'} aria-label="Nicht in Ordnung" onClick={() => setOk((x) => ({ ...x, [c.id]: false }))}>
                  <MockIcon ctx="btn" n="x" size={20} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <MockTextarea value={notiz} onChange={(e) => setNotiz(e.target.value)} placeholder={maengel ? 'Was ist nicht in Ordnung?' : 'Notiz'} rows={3} />
      <label className="ap-datei">
        <MockIcon ctx="default" n="camera" size={18} />
        <span>{dateien.length ? `${dateien.length} Foto${dateien.length === 1 ? '' : 's'}` : 'Foto'}</span>
        <input type="file" accept="image/*" capture="environment" multiple onChange={(e) => setDateien(Array.from(e.target.files ?? []).slice(0, 8))} />
      </label>
      {fehler ? (
        <div className="ap-fehler" role="alert">
          {fehler}
        </div>
      ) : null}
      <MockBtn kind="primary" type="button" className="ap-abhaken__fertig" onClick={fertig} disabled={laeuft}>
        {laeuft ? 'Speichert …' : maengel ? `Erledigt · ${maengel} melden` : 'Erledigt'}
      </MockBtn>
    </div>
  )
}
