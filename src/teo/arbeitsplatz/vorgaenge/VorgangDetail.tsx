'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'

import { formatDatum, formatDatumZeit, formatEuro } from '@/lib/shared-domain/geld-datum'
import { MockBadge, MockBtn, MockCard, MockCheckbox, MockEmpty, MockIcon, MockProp, MockTabs, MockTextarea } from '@/teo/arbeitsplatz/kit'
import {
  anTeoGeben,
  angebotEntscheiden,
  meldungAbweisen,
  nachrichtAnTeo,
  type ApAktionsErgebnis,
} from '@/teo/arbeitsplatz/aktionen/vorgang'
import type { ApVorgangDetail } from '@/teo/arbeitsplatz/daten/vorgang-detail'
import { AP_STATUS } from '@/teo/arbeitsplatz/vorgang-status'

type Rechte = { anTeo: boolean; freigeben: boolean; nachricht: boolean; kosten: boolean }

const PROTOKOLL_TEXT: Record<string, string> = {
  freigegeben: 'Freigegeben',
  abgelehnt: 'Abgelehnt',
  beschluss_ausstehend: 'Wartet auf Beschluss',
}

const KONTAKT_FELD = /^(vorname|nachname|name|stra(ß|ss)e|hausnummer|plz|ort|e-?mail|telefon|adresse|firma|situation)/i

type VerlaufPunkt = { id: string; wann: string; titel: string; text?: string | null; fotos?: string[]; link?: { href: string; label: string } }

export function VorgangDetail({ d, rechte, weg }: { d: ApVorgangDetail; rechte: Rechte; weg: boolean }) {
  const router = useRouter()
  const [laeuft, starten] = useTransition()
  const [fehler, setFehler] = useState<string | null>(null)
  const [ablehnen, setAblehnen] = useState(false)
  const [grund, setGrund] = useState('')
  const [freigabeKarte, setFreigabeKarte] = useState(false)
  const [beschluss, setBeschluss] = useState(false)
  const [beschlussDatei, setBeschlussDatei] = useState<File | null>(null)
  const [nachricht, setNachricht] = useState('')
  const { zeile, item } = d
  const st = AP_STATUS[zeile.status]

  function ausfuehren(fn: () => Promise<ApAktionsErgebnis>, danach?: () => void) {
    setFehler(null)
    starten(async () => {
      const r = await fn()
      if (!r.ok) {
        setFehler(r.fehler)
        return
      }
      danach?.()
      router.refresh()
    })
  }

  const istNeu = zeile.status === 'neu' && rechte.anTeo
  const zuEntscheiden = zeile.status === 'zu_entscheiden' && rechte.freigeben

  const verlauf = useMemo<VerlaufPunkt[]>(() => {
    const punkte: VerlaufPunkt[] = [{ id: 'gemeldet', wann: zeile.erstellt, titel: 'Gemeldet', text: item?.melderName ? `von ${item.melderName}` : null }]
    for (const t of d.termine) punkte.push({ id: `t-${t.id}`, wann: t.von, titel: `Termin: ${formatDatumZeit(t.von)}`, text: t.titel })
    for (const [i, b] of (item?.bautagebuch ?? []).entries()) {
      punkte.push({ id: `b-${b.id ?? i}`, wann: b.created_at ?? b.datum ?? zeile.erstellt, titel: b.titel || 'Update', text: b.notiz, fotos: b.fotos_urls })
    }
    for (const p of d.protokoll) {
      const betrag = rechte.kosten && p.betrag != null ? ` · ${formatEuro(p.betrag)}` : ''
      punkte.push({
        id: `p-${p.id}`,
        wann: p.wann,
        titel: `${PROTOKOLL_TEXT[p.aktion] ?? p.aktion} von ${p.wer}${betrag}`,
        text: [p.beschluss ? 'Beschluss der Eigentümer liegt vor' : null, p.notiz].filter(Boolean).join('\n') || null,
        link: p.beschlussUrl ? { href: p.beschlussUrl, label: 'Beschluss öffnen' } : undefined,
      })
    }
    return punkte.sort((a, b) => Date.parse(b.wann) - Date.parse(a.wann))
  }, [d, item, zeile, rechte.kosten])

  const positionen = item?.angebotPositionen ?? item?.auftragPositionen ?? []
  const dokumente = item?.dokumente ?? []
  const tabs = [
    { id: 'verlauf', label: 'Verlauf', icon: 'timeline' },
    ...(rechte.kosten && (positionen.length || item?.gesamtBrutto) ? [{ id: 'angebot', label: 'Angebot', icon: 'file-invoice' }] : []),
    { id: 'dokumente', label: 'Dokumente', icon: 'files', count: dokumente.length || undefined },
    { id: 'nachrichten', label: 'Nachrichten', icon: 'messages', count: d.nachrichten.length || undefined },
  ]
  const [tab, setTab] = useState('verlauf')

  // Nur Beschreibendes — Name/Adresse/Kontakt stehen schon oben (Objekt, Gemeldet von)
  const angaben = (item?.sections ?? [])
    .flatMap((s) => s.rows ?? [])
    .filter((r, i, alle) => !KONTAKT_FELD.test(r.label) && alle.findIndex((x) => x.label === r.label) === i)

  return (
    <div className="detail-entity-page">
      <header className="detail-head detail-head--project">
        <div className="detail-head-main vgid min-w-0 flex-1">
          <div className="dh-titlerow">
            <div className="dh-title vgid-name">{zeile.titel}</div>
          </div>
          <div className="dh-meta vgid-meta">
            <MockBadge kind={st.badge}>{st.label}</MockBadge>
            {zeile.dringend ? <MockBadge kind="storniert">Dringend</MockBadge> : null}
            {rechte.kosten && zeile.betrag != null ? <span className="dh-amount">{formatEuro(zeile.betrag)}</span> : null}
            <span className="sep" aria-hidden>·</span>
            <span>{[zeile.objektName ?? '—', zeile.einheit].filter(Boolean).join(' · ')}</span>
            <span className="sep" aria-hidden>·</span>
            <span>{formatDatum(zeile.erstellt)}</span>
          </div>
        </div>
        {istNeu || zuEntscheiden ? (
          <div className="detail-head-actions min-w-0">
            <MockBtn kind="secondary" sm type="button" disabled={laeuft} onClick={() => setAblehnen((v) => !v)}>
              Ablehnen
            </MockBtn>
            <MockBtn
              kind="primary"
              sm
              type="button"
              disabled={laeuft}
              onClick={() =>
                !istNeu && weg
                  ? setFreigabeKarte((v) => !v)
                  : ausfuehren(() => (istNeu ? anTeoGeben(zeile.id) : angebotEntscheiden(zeile.id, 'freigegeben', { betragEur: zeile.betrag })))
              }
            >
              {istNeu ? 'An TEO geben' : 'Freigeben'}
            </MockBtn>
          </div>
        ) : null}
      </header>

      {freigabeKarte ? (
        <MockCard title="Angebot freigeben" icon="circle-check-filled">
          <label className="ap-check">
            <MockCheckbox checked={beschluss} onChange={() => setBeschluss((v) => !v)} />
            <span>Beschluss der Eigentümer liegt vor</span>
          </label>
          {beschluss ? (
            <label className="ap-datei" style={{ marginTop: 10 }}>
              <MockIcon ctx="default" n="paperclip" size={18} />
              <span>{beschlussDatei ? beschlussDatei.name : 'Beschluss anhängen (optional)'}</span>
              <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => setBeschlussDatei(e.target.files?.[0] ?? null)} />
            </label>
          ) : null}
          <div className="ap-knopfzeile">
            <MockBtn kind="ghost" sm type="button" onClick={() => setFreigabeKarte(false)}>
              Abbrechen
            </MockBtn>
            <MockBtn
              kind="primary"
              sm
              type="button"
              disabled={laeuft}
              onClick={() =>
                ausfuehren(async () => {
                  let beschlussUrl: string | null = null
                  if (beschluss && beschlussDatei && zeile.objektId) {
                    const fd = new FormData()
                    fd.set('datei', beschlussDatei)
                    fd.set('name', `Beschluss: ${zeile.titel}`.slice(0, 160))
                    const res = await fetch(`/arbeitsplatz/objekte/${zeile.objektId}/dokumente`, { method: 'POST', body: fd })
                    const j = (await res.json().catch(() => ({}))) as { ok?: boolean; url?: string; fehler?: string }
                    if (!res.ok || !j.url) return { ok: false, fehler: j.fehler ?? 'Beschluss konnte nicht hochgeladen werden.' }
                    beschlussUrl = j.url
                  }
                  return angebotEntscheiden(zeile.id, 'freigegeben', { betragEur: zeile.betrag, beschlussLiegtVor: beschluss, beschlussUrl })
                }, () => setFreigabeKarte(false))
              }
            >
              Freigeben
            </MockBtn>
          </div>
        </MockCard>
      ) : null}

      {ablehnen ? (
        <MockCard title={istNeu ? 'Meldung ablehnen' : 'Angebot ablehnen'} icon="circle-x">
          <MockTextarea value={grund} onChange={(e) => setGrund(e.target.value)} placeholder="Grund" rows={3} />
          <div className="ap-knopfzeile">
            <MockBtn kind="ghost" sm type="button" onClick={() => setAblehnen(false)}>
              Abbrechen
            </MockBtn>
            <MockBtn
              kind="danger"
              sm
              type="button"
              disabled={laeuft}
              onClick={() =>
                ausfuehren(
                  () => (istNeu ? meldungAbweisen(zeile.id) : angebotEntscheiden(zeile.id, 'abgelehnt', { notiz: grund })),
                  () => setAblehnen(false)
                )
              }
            >
              Ablehnen
            </MockBtn>
          </div>
        </MockCard>
      ) : null}

      {fehler ? (
        <div className="ap-fehler" role="alert">
          {fehler}
        </div>
      ) : null}

      <div className="dshell">
        <MockTabs items={tabs} value={tab} onChange={setTab} aria-label="Bereiche" className="dshell-nav" tabClassName="dshell-navitem" iconCtx="nav" />
        <div className="dshell-body">
          <div className="dshell-group active">
            <div className="dshell-cards">
              {tab === 'verlauf' ? (
                <>
                  <MockCard title="Angaben" icon="info-circle">
                    <div className="props">
                      <MockProp label="Objekt">{zeile.objektName ?? '—'}</MockProp>
                      {zeile.einheit ? <MockProp label="Einheit">{zeile.einheit}</MockProp> : null}
                      {item?.melderName ? <MockProp label="Gemeldet von">{item.melderName}</MockProp> : null}
                      {item?.melderEinheit ? <MockProp label="Einheit">{item.melderEinheit}</MockProp> : null}
                      {item?.melderTelefon ? <MockProp label="Telefon">{item.melderTelefon}</MockProp> : null}
                      {item?.melderEmail ? <MockProp label="E-Mail">{item.melderEmail}</MockProp> : null}
                      {angaben.map((r, i) => (
                        <MockProp key={`${i}-${r.label}`} label={r.label}>
                          {r.value}
                        </MockProp>
                      ))}
                    </div>
                    {item?.meldeFotos?.length ? <Fotos urls={item.meldeFotos} /> : null}
                  </MockCard>
                  <MockCard title="Verlauf" icon="timeline">
                    <ol className="ap-verlauf">
                      {verlauf.map((p, i) => (
                        <li key={`${i}-${p.id}`}>
                          <div className="ap-verlauf__kopf">
                            <span className="ap-verlauf__titel">{p.titel}</span>
                            <span className="ap-gedimmt">{formatDatum(p.wann)}</span>
                          </div>
                          {p.text ? <div className="ap-verlauf__text">{p.text}</div> : null}
                          {p.link ? (
                            <a className="ap-link" href={p.link.href} target="_blank" rel="noreferrer">
                              {p.link.label}
                            </a>
                          ) : null}
                          {p.fotos?.length ? <Fotos urls={p.fotos} /> : null}
                        </li>
                      ))}
                    </ol>
                  </MockCard>
                </>
              ) : null}

              {tab === 'angebot' ? (
                <MockCard title="Angebot" icon="file-invoice">
                  {positionen.length ? (
                    <div className="listcard">
                      {positionen.map((p) => (
                        <div key={p.id} className="list-row" style={{ gridTemplateColumns: 'minmax(0, 1fr) 120px' }}>
                          <div className="ap-zelle-titel">
                            <div className="lc-title">{p.title}</div>
                            {'mengeLabel' in p && p.mengeLabel ? <div className="lc-sub">{p.mengeLabel}</div> : null}
                          </div>
                          <div className="ap-rechts">{'preisBrutto' in p ? formatEuro(p.preisBrutto) : '—'}</div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {item?.gesamtBrutto != null ? (
                    <div className="ap-summe">
                      <span>Gesamt (brutto)</span>
                      <strong>{formatEuro(item.gesamtBrutto)}</strong>
                    </div>
                  ) : null}
                </MockCard>
              ) : null}

              {tab === 'dokumente' ? (
                dokumente.length ? (
                  <div className="listcard">
                    {dokumente.map((doc) => (
                      <a key={doc.id} href={doc.href} target="_blank" rel="noreferrer" className="list-row" style={{ gridTemplateColumns: '28px minmax(0, 1fr) 110px' }}>
                        <MockIcon ctx="row" n={doc.art === 'foto' ? 'photo' : doc.art === 'rechnung' ? 'receipt' : 'file-text'} size={16} />
                        <div className="lc-title">{doc.name}</div>
                        <div className="lc-desk ap-gedimmt">{doc.datum ? formatDatum(doc.datum) : ''}</div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <MockEmpty icon="files" title="Noch keine Dokumente" />
                )
              ) : null}

              {tab === 'nachrichten' ? (
                <MockCard title="Nachrichten an TEO" icon="messages">
                  {d.nachrichten.length ? (
                    <ol className="ap-nachrichten">
                      {d.nachrichten.map((n) => (
                        <li key={n.id} className={n.vonTeo ? 'ap-nachricht ap-nachricht--teo' : 'ap-nachricht'}>
                          <div className="ap-verlauf__kopf">
                            <span className="ap-verlauf__titel">{n.von}</span>
                            <span className="ap-gedimmt">{formatDatumZeit(n.wann)}</span>
                          </div>
                          <div className="ap-verlauf__text">{n.text}</div>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                  {rechte.nachricht ? (
                    <div className="ap-schreiben">
                      <MockTextarea value={nachricht} onChange={(e) => setNachricht(e.target.value)} placeholder="Nachricht an TEO" rows={3} />
                      <div className="ap-knopfzeile">
                        <MockBtn
                          kind="primary"
                          sm
                          type="button"
                          disabled={laeuft || !nachricht.trim()}
                          onClick={() => ausfuehren(() => nachrichtAnTeo(zeile.id, nachricht), () => setNachricht(''))}
                        >
                          Senden
                        </MockBtn>
                      </div>
                    </div>
                  ) : null}
                </MockCard>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Fotos({ urls }: { urls: string[] }) {
  return (
    <div className="ap-fotos">
      {urls.slice(0, 12).map((u) => (
        <a key={u} href={u} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={u} alt="" loading="lazy" />
        </a>
      ))}
    </div>
  )
}
