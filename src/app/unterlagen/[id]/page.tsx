import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { istTeo, MARKE } from '@/lib/marke'
import { formatDatum, formatDatumZeit, formatEuro } from '@/lib/shared-domain/geld-datum'
import { ladeVorgangDetail } from '@/teo/arbeitsplatz/daten/vorgang-detail'
import { ladeApKontext } from '@/teo/arbeitsplatz/kontext'
import { DruckenKnopf } from '@/teo/arbeitsplatz/objekte/DruckenKnopf'
import { darf } from '@/teo/arbeitsplatz/rechte'

import '@/teo/arbeitsplatz/aushang.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Schadenunterlagen', robots: { index: false, follow: false } }

type Eintrag = { wann: string; titel: string; text?: string | null; fotos?: string[] }

/** Schadenunterlagen eines Vorgangs (A4, Browser-Druck / PDF) — z. B. für die Versicherung. */
export default async function UnterlagenSeite({ params }: { params: Promise<{ id: string }> }) {
  if (!istTeo) notFound()
  const { id } = await params
  const k = await ladeApKontext()
  if (!k) redirect(`/portal/login?next=/unterlagen/${id}`)
  const d = await ladeVorgangDetail(k, id)
  if (!d) notFound()
  const kosten = darf(k.person, 'kosten.sehen')
  const { zeile, item } = d

  const verlauf: Eintrag[] = [
    ...d.termine.map((t) => ({ wann: t.von, titel: `Termin: ${t.titel}` })),
    ...(item?.bautagebuch ?? []).map((b) => ({
      wann: b.created_at ?? b.datum ?? zeile.erstellt,
      titel: b.titel || 'Update',
      text: b.notiz,
      fotos: b.fotos_urls,
    })),
  ].sort((a, b) => Date.parse(a.wann) - Date.parse(b.wann))

  const nachweise = (item?.dokumente ?? []).filter((x) => x.art === 'protokoll' || (kosten && x.art === 'rechnung'))
  const fachdetails = item?.meldeFachdetails ?? []

  return (
    <div className="ah-seite">
      <div className="ah-werkzeug">
        <DruckenKnopf />
      </div>
      <article className="ah-blatt ul-blatt">
        <header className="ah-kopf">
          <div className="ah-org">Schadenunterlagen</div>
          <div className="ah-objekt">
            {[zeile.objektName, zeile.einheit].filter(Boolean).join(' · ')} · {k.org.name}
          </div>
        </header>

        <h1 className="ul-titel">{zeile.titel}</h1>
        <dl className="ul-fakten">
          <div>
            <dt>Gemeldet am</dt>
            <dd>{formatDatumZeit(zeile.erstellt)}</dd>
          </div>
          {zeile.melder ? (
            <div>
              <dt>Gemeldet von</dt>
              <dd>{zeile.melder}</dd>
            </div>
          ) : null}
          {kosten && zeile.abgerechnet != null ? (
            <div>
              <dt>Abgerechnet (brutto)</dt>
              <dd>{formatEuro(zeile.abgerechnet)}</dd>
            </div>
          ) : null}
        </dl>

        <section className="ul-abschnitt">
          <h2>Meldung</h2>
          {item?.meldeBeschreibung ? <p className="ul-text">{item.meldeBeschreibung}</p> : null}
          {fachdetails.length ? (
            <dl className="ul-fakten">
              {fachdetails.map((f) => (
                <div key={f.label}>
                  <dt>{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {item?.meldeFotos?.length ? <Fotos urls={item.meldeFotos} /> : null}
        </section>

        {verlauf.length ? (
          <section className="ul-abschnitt">
            <h2>Verlauf</h2>
            <ol className="ul-verlauf">
              {verlauf.map((e, i) => (
                <li key={`${e.wann}-${i}`}>
                  <span className="ul-wann">{formatDatum(e.wann)}</span>
                  <div>
                    <strong>{e.titel}</strong>
                    {e.text ? <p className="ul-text">{e.text}</p> : null}
                    {e.fotos?.length ? <Fotos urls={e.fotos} /> : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {nachweise.length ? (
          <section className="ul-abschnitt">
            <h2>Abnahme und Rechnung</h2>
            <ul className="ul-nachweise">
              {nachweise.map((n) => (
                <li key={n.id}>
                  <a href={n.href}>{n.name}</a>
                  {n.datum ? <span> · {formatDatum(n.datum)}</span> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <footer className="ah-fuss">
          <div className="ah-kontakt">
            Erstellt am {formatDatum(new Date().toISOString())} · {MARKE.firma.firmenname} · {MARKE.firma.email}
          </div>
        </footer>
      </article>
    </div>
  )
}

function Fotos({ urls }: { urls: string[] }) {
  return (
    <div className="ul-fotos">
      {urls.map((u) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={u} src={u} alt="" />
      ))}
    </div>
  )
}
