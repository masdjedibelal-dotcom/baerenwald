'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { MockCheckbox, MockField, MockFormSection, MockInput, MockSegment, MockSelect, MockTextarea } from '@/teo/arbeitsplatz/kit'
import { planEntfernen, planSpeichern, type PlanFelder } from '@/teo/arbeitsplatz/aktionen/plaene'
import { heute, PLAN_ART_LABEL, PLAN_VORLAGEN, type IntervallEinheit, type PlanArt } from '@/teo/arbeitsplatz/plaene/plan-logik'
import { ApSheet } from '@/teo/arbeitsplatz/shell/ApSheet'

type Auswahl = Array<{ id: string; name: string }>
export type AnlageAuswahl = Array<{ id: string; name: string; objektId: string }>

export function PlanFormular({
  planId,
  start,
  objekte,
  teamPersonen,
  anlagen = [],
  onClose,
}: {
  planId: string | null
  start: Partial<PlanFelder>
  objekte: Auswahl
  teamPersonen: Auswahl
  anlagen?: AnlageAuswahl
  onClose: () => void
}) {
  const router = useRouter()
  const [f, setF] = useState<PlanFelder>({
    titel: start.titel ?? '',
    art: start.art ?? 'kontrolle',
    objektId: start.objektId ?? objekte[0]?.id ?? '',
    anlageId: start.anlageId ?? null,
    einheit: start.einheit ?? 'woche',
    anzahl: start.anzahl ?? 1,
    naechste: start.naechste ?? heute(),
    zustaendig: start.zustaendig ?? 'team',
    zustaendigId: start.zustaendigId ?? null,
    punkte: start.punkte ?? [],
    mieter: start.mieter ?? false,
  })
  const [punkteText, setPunkteText] = useState((start.punkte ?? []).join('\n'))
  const [fehler, setFehler] = useState<string | null>(null)
  const [laeuft, starten] = useTransition()
  const anlagenHier = anlagen.filter((a) => a.objektId === f.objektId)

  function vorlage(id: string) {
    const v = PLAN_VORLAGEN.find((x) => x.id === id)
    if (!v) return
    setF((x) => ({ ...x, titel: v.titel, art: v.art, einheit: v.einheit, anzahl: v.anzahl, zustaendig: v.zustaendig, mieter: v.mieter }))
    setPunkteText(v.punkte.join('\n'))
  }

  function los(fn: () => Promise<{ ok: true; id?: string } | { ok: false; fehler: string }>, nach?: (id?: string) => void) {
    setFehler(null)
    starten(async () => {
      const r = await fn()
      if (!r.ok) {
        setFehler(r.fehler)
        return
      }
      onClose()
      if (nach) nach(r.id)
      else router.refresh()
    })
  }

  return (
    <ApSheet
      open
      titel={planId ? 'Plan bearbeiten' : 'Neuer Plan'}
      onClose={onClose}
      onSpeichern={() =>
        los(
          () => planSpeichern(planId, { ...f, punkte: punkteText.split('\n') }),
          planId ? undefined : (id) => router.push(id ? `/arbeitsplatz/plaene/${id}` : '/arbeitsplatz/plaene')
        )
      }
      gefahr={planId ? { label: 'Entfernen', onClick: () => los(() => planEntfernen(planId), () => router.push('/arbeitsplatz/plaene')) } : undefined}
      laeuft={laeuft}
    >
      {!planId ? (
        <MockFormSection title="Vorlage">
          <MockField full>
            <MockSelect defaultValue="" onChange={(e) => vorlage(e.target.value)}>
              <option value="">Ohne Vorlage</option>
              {PLAN_VORLAGEN.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.titel}
                </option>
              ))}
            </MockSelect>
          </MockField>
        </MockFormSection>
      ) : null}
      <MockFormSection title="Plan">
        <MockField label="Name" required full>
          <MockInput value={f.titel} onChange={(e) => setF((x) => ({ ...x, titel: e.target.value }))} />
        </MockField>
        <MockField label="Objekt" required>
          <MockSelect value={f.objektId} onChange={(e) => setF((x) => ({ ...x, objektId: e.target.value, anlageId: null }))}>
            {objekte.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </MockSelect>
        </MockField>
        {anlagenHier.length ? (
          <MockField label="Anlage">
            <MockSelect value={f.anlageId ?? ''} onChange={(e) => setF((x) => ({ ...x, anlageId: e.target.value || null }))}>
              <option value="">Keine</option>
              {anlagenHier.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </MockSelect>
          </MockField>
        ) : null}
        <MockField label="Art">
          <MockSelect value={f.art} onChange={(e) => setF((x) => ({ ...x, art: e.target.value as PlanArt }))}>
            {(Object.keys(PLAN_ART_LABEL) as PlanArt[]).map((a) => (
              <option key={a} value={a}>
                {PLAN_ART_LABEL[a]}
              </option>
            ))}
          </MockSelect>
        </MockField>
        <MockField label="Alle">
          <MockInput type="number" min={1} max={120} value={f.anzahl} onChange={(e) => setF((x) => ({ ...x, anzahl: Number(e.target.value) || 1 }))} />
        </MockField>
        <MockField label="Einheit">
          <MockSelect value={f.einheit} onChange={(e) => setF((x) => ({ ...x, einheit: e.target.value as IntervallEinheit }))}>
            <option value="tag">Tage</option>
            <option value="woche">Wochen</option>
            <option value="monat">Monate</option>
            <option value="jahr">Jahre</option>
          </MockSelect>
        </MockField>
        <MockField label="Nächste Fälligkeit" required>
          <MockInput type="date" value={f.naechste} onChange={(e) => setF((x) => ({ ...x, naechste: e.target.value }))} />
        </MockField>
      </MockFormSection>
      <MockFormSection title="Wer erledigt">
        <MockField full>
          <MockSegment
            value={f.zustaendig}
            onChange={(v) => setF((x) => ({ ...x, zustaendig: v }))}
            options={[
              { value: 'team', label: 'Eigenes Team' },
              { value: 'teo', label: 'TEO' },
            ]}
          />
        </MockField>
        {f.zustaendig === 'team' && teamPersonen.length ? (
          <MockField label="Person" full>
            <MockSelect value={f.zustaendigId ?? ''} onChange={(e) => setF((x) => ({ ...x, zustaendigId: e.target.value || null }))}>
              <option value="">Alle im Team</option>
              {teamPersonen.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </MockSelect>
          </MockField>
        ) : null}
      </MockFormSection>
      {f.zustaendig === 'team' ? (
        <MockFormSection title="Checkliste">
          <MockField full>
            <MockTextarea value={punkteText} onChange={(e) => setPunkteText(e.target.value)} rows={6} placeholder="Ein Punkt pro Zeile" />
          </MockField>
          <label className="ap-check">
            <MockCheckbox checked={f.mieter} onChange={() => setF((x) => ({ ...x, mieter: !x.mieter }))} />
            <span>Für Mieter sichtbar</span>
          </label>
        </MockFormSection>
      ) : null}
      {fehler ? (
        <div className="ap-fehler" role="alert">
          {fehler}
        </div>
      ) : null}
    </ApSheet>
  )
}
