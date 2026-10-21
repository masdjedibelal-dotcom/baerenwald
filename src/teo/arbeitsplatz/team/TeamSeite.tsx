'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'

import { MockBadge, MockCheckbox, MockField, MockFormSection, MockInput, MockSegment } from '@/teo/arbeitsplatz/kit'
import { personAendern, personEinladen, personEntfernen, type PersonFelder } from '@/teo/arbeitsplatz/aktionen/team'
import type { ApTeamPerson } from '@/teo/arbeitsplatz/daten/team'
import { ROLLEN_LABEL, type ApRolle } from '@/teo/arbeitsplatz/rechte'
import { ApSheet } from '@/teo/arbeitsplatz/shell/ApSheet'

const SPALTEN = 'minmax(0, 1.6fr) minmax(0, 1.6fr) 120px minmax(0, 1.4fr)'

export function TeamSeite({ personen, objekte }: { personen: ApTeamPerson[]; objekte: Array<{ id: string; name: string }> }) {
  const router = useRouter()
  const params = useSearchParams()
  const [person, setPerson] = useState<ApTeamPerson | null>(null)
  const offen: ApTeamPerson | 'neu' | null = params.get('neu') === '1' ? 'neu' : person
  const setOffen = (x: ApTeamPerson | 'neu' | null) => {
    if (x === 'neu') router.replace('/arbeitsplatz/team?neu=1', { scroll: false })
    else {
      if (params.get('neu')) router.replace('/arbeitsplatz/team', { scroll: false })
      setPerson(x)
    }
  }
  const objektName = new Map(objekte.map((o) => [o.id, o.name]))

  return (
    <div>
      <div className="listcard">
        <div className="list-row head" style={{ gridTemplateColumns: SPALTEN }} aria-hidden>
          <div>Name</div>
          <div>E-Mail</div>
          <div>Rolle</div>
          <div>Rechte / Objekte</div>
        </div>
        {personen.map((p) => (
          <button
            key={p.id ?? 'haupt'}
            type="button"
            className="list-row ap-zeile-knopf"
            style={{ gridTemplateColumns: SPALTEN }}
            onClick={() => (p.id && !p.istIch ? setOffen(p) : undefined)}
            disabled={!p.id || p.istIch}
          >
            <div className="ap-zelle-titel">
              <div className="lc-title">{p.name}</div>
              {p.eingeladen ? (
                <div className="lc-pills">
                  <MockBadge kind="warten">Eingeladen</MockBadge>
                </div>
              ) : null}
            </div>
            <div className="lc-sub">{p.email}</div>
            <div className="lc-pills">
              <MockBadge kind="plain">{ROLLEN_LABEL[p.rolle]}</MockBadge>
            </div>
            <div className="lc-desk ap-gedimmt">
              {p.rolle === 'verwaltung'
                ? [p.istAdmin ? 'Admin' : null, p.darfFreigeben ? 'Darf freigeben' : null].filter(Boolean).join(' · ') || '—'
                : p.objektIds.map((id) => objektName.get(id)).filter(Boolean).join(', ') || 'Kein Objekt'}
            </div>
          </button>
        ))}
      </div>
      {offen ? <PersonSheet person={offen === 'neu' ? null : offen} objekte={objekte} onClose={() => setOffen(null)} /> : null}
    </div>
  )
}

function PersonSheet({ person, objekte, onClose }: { person: ApTeamPerson | null; objekte: Array<{ id: string; name: string }>; onClose: () => void }) {
  const router = useRouter()
  const [f, setF] = useState<PersonFelder>({
    name: person?.name ?? '',
    email: person?.email ?? '',
    rolle: person?.rolle ?? 'verwaltung',
    istAdmin: person?.istAdmin ?? false,
    darfFreigeben: person?.darfFreigeben ?? true,
    objektIds: person?.objektIds ?? [],
  })
  const [fehler, setFehler] = useState<string | null>(null)
  const [laeuft, starten] = useTransition()

  function los(fn: () => ReturnType<typeof personEntfernen>) {
    setFehler(null)
    starten(async () => {
      const r = await fn()
      if (!r.ok) {
        setFehler(r.fehler)
        return
      }
      onClose()
      router.refresh()
    })
  }

  const toggleObjekt = (id: string) =>
    setF((x) => ({ ...x, objektIds: x.objektIds.includes(id) ? x.objektIds.filter((o) => o !== id) : [...x.objektIds, id] }))

  return (
    <ApSheet
      open
      titel={person ? person.name : 'Person einladen'}
      onClose={onClose}
      onSpeichern={() => los(() => (person?.id ? personAendern(person.id, f) : personEinladen(f)))}
      speichernLabel={person ? 'Speichern' : 'Einladen'}
      gefahr={person?.id ? { label: 'Entfernen', onClick: () => los(() => personEntfernen(person.id!)) } : undefined}
      laeuft={laeuft}
    >
      <MockFormSection title="Person">
        <MockField label="Name" required>
          <MockInput value={f.name} onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))} autoFocus />
        </MockField>
        <MockField label="E-Mail" required>
          <MockInput type="email" value={f.email ?? ''} disabled={Boolean(person)} onChange={(e) => setF((x) => ({ ...x, email: e.target.value }))} />
        </MockField>
        <MockField label="Rolle" full>
          <MockSegment
            value={f.rolle}
            onChange={(v) => setF((x) => ({ ...x, rolle: v as ApRolle }))}
            options={(['verwaltung', 'team', 'eigentuemer'] as ApRolle[]).map((r) => ({ value: r, label: ROLLEN_LABEL[r] }))}
          />
        </MockField>
      </MockFormSection>

      {f.rolle === 'verwaltung' ? (
        <MockFormSection title="Rechte">
          <label className="ap-check">
            <MockCheckbox checked={f.darfFreigeben || f.istAdmin} disabled={f.istAdmin} onChange={() => setF((x) => ({ ...x, darfFreigeben: !x.darfFreigeben }))} />
            <span>Darf freigeben</span>
          </label>
          <label className="ap-check">
            <MockCheckbox checked={f.istAdmin} onChange={() => setF((x) => ({ ...x, istAdmin: !x.istAdmin }))} />
            <span>Admin</span>
          </label>
        </MockFormSection>
      ) : (
        <MockFormSection title="Objekte">
          {objekte.map((o) => (
            <label key={o.id} className="ap-check">
              <MockCheckbox checked={f.objektIds.includes(o.id)} onChange={() => toggleObjekt(o.id)} />
              <span>{o.name}</span>
            </label>
          ))}
        </MockFormSection>
      )}
      {fehler ? (
        <div className="ap-fehler" role="alert">
          {fehler}
        </div>
      ) : null}
    </ApSheet>
  )
}
