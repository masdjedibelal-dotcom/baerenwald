import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { logDbError } from '@/lib/errors/log-db-error'
import { istTeo } from '@/lib/marke'
import { formatDatum, formatEuro } from '@/lib/shared-domain/geld-datum'
import { supabaseAdmin } from '@/lib/supabase'
import { ladeObjekt } from '@/teo/arbeitsplatz/daten/objekte'
import { DruckFuss, DruckKopf, ladeOrgLogo } from '@/teo/arbeitsplatz/druck/DruckKopf'
import { DRUCK_SCHRIFT } from '@/teo/arbeitsplatz/druck/schrift'
import { ladeApKontext } from '@/teo/arbeitsplatz/kontext'
import { DruckenKnopf } from '@/teo/arbeitsplatz/objekte/DruckenKnopf'
import { PLAN_ART_LABEL, type PlanArt } from '@/teo/arbeitsplatz/plaene/plan-logik'
import { darf } from '@/teo/arbeitsplatz/rechte'
import { AP_STATUS } from '@/teo/arbeitsplatz/vorgang-status'

import '@/teo/arbeitsplatz/aushang.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Jahresbericht', robots: { index: false, follow: false } }

type PlanZeile = { titel: string; art: PlanArt; erledigt: number; zuletzt: string | null; naechste: string }

/** Jahresbericht eines Objekts für die Eigentümerversammlung (A4, Browser-Druck / PDF). */
export default async function BerichtSeite({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ jahr?: string }> }) {
  if (!istTeo) notFound()
  const { id } = await params
  const { jahr: jahrParam } = await searchParams
  const k = await ladeApKontext()
  if (!k) redirect(`/portal/login?next=/bericht/${id}`)
  const aktuell = new Date().getFullYear()
  const jahr = /^\d{4}$/.test(jahrParam ?? '') ? Math.min(aktuell, Math.max(2020, Number(jahrParam))) : aktuell

  const [d, logoUrl] = await Promise.all([ladeObjekt(k, id), ladeOrgLogo(k.org.id)])
  if (!d) notFound()
  const kosten = darf(k.person, 'kosten.sehen')
  const vorgaenge = d.vorgaenge.filter((v) => new Date(v.erstellt).getFullYear() === jahr).sort((a, b) => a.erstellt.localeCompare(b.erstellt))
  const erledigt = vorgaenge.filter((v) => v.status === 'erledigt').length
  const offen = vorgaenge.filter((v) => v.status !== 'erledigt' && v.status !== 'abgelehnt').length
  const summeAngebot = vorgaenge.reduce((s, v) => s + (v.status === 'abgelehnt' ? 0 : v.betrag ?? 0), 0)
  const summeAbgerechnet = vorgaenge.reduce((s, v) => s + (v.abgerechnet ?? 0), 0)

  const plaene = await ladePlaene(k.org.id, id, jahr)
  const erledigungen = plaene.reduce((s, p) => s + p.erledigt, 0)

  return (
    <div className={`ah-seite ${DRUCK_SCHRIFT}`}>
      <div className="ah-werkzeug">
        <nav className="ul-jahre" aria-label="Jahr">
          {[aktuell - 2, aktuell - 1, aktuell].map((j) => (
            <a key={j} href={`/bericht/${id}?jahr=${j}`} aria-current={j === jahr ? 'page' : undefined}>
              {j}
            </a>
          ))}
        </nav>
        <DruckenKnopf />
      </div>
      <article className="ah-blatt ul-blatt">
        <DruckKopf orgName={k.org.name} logoUrl={logoUrl} art="Jahresbericht">
          <b>{d.objekt.name}</b>
          {d.objekt.adresse ? <div>{d.objekt.adresse}</div> : null}
        </DruckKopf>

        <h1 className="ul-titel">Jahresbericht {jahr}</h1>
        <p className="ul-unter">
          {d.objekt.name} · für die Eigentümerversammlung · Stand {formatDatum(new Date().toISOString())}
        </p>

        <dl className="ul-fakten">
          <div>
            <dt>Vorgänge</dt>
            <dd>{vorgaenge.length}</dd>
          </div>
          <div>
            <dt>Erledigt</dt>
            <dd>{erledigt}</dd>
          </div>
          <div>
            <dt>Noch offen</dt>
            <dd>{offen}</dd>
          </div>
          {kosten ? (
            <div>
              <dt>Abgerechnet (brutto)</dt>
              <dd>{formatEuro(summeAbgerechnet)}</dd>
            </div>
          ) : null}
          <div>
            <dt>Wartungen & Prüfungen</dt>
            <dd>{erledigungen}</dd>
          </div>
        </dl>

        <section className="ul-abschnitt">
          <h2>Vorgänge {jahr}</h2>
          {vorgaenge.length ? (
            <table className="ul-tabelle">
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Vorgang</th>
                  <th>Stand</th>
                  {kosten ? <th className="zahl">Angebot</th> : null}
                  {kosten ? <th className="zahl">Abgerechnet</th> : null}
                </tr>
              </thead>
              <tbody>
                {vorgaenge.map((v) => (
                  <tr key={v.id}>
                    <td className="zahl" style={{ textAlign: 'left' }}>
                      {formatDatum(v.erstellt)}
                    </td>
                    <td>
                      {v.titel}
                      {v.einheit ? ` · ${v.einheit}` : ''}
                    </td>
                    <td>{AP_STATUS[v.status].label}</td>
                    {kosten ? <td className="zahl">{v.betrag != null && v.status !== 'abgelehnt' ? formatEuro(v.betrag) : '—'}</td> : null}
                    {kosten ? <td className="zahl">{v.abgerechnet != null ? formatEuro(v.abgerechnet) : '—'}</td> : null}
                  </tr>
                ))}
              </tbody>
              {kosten ? (
                <tfoot>
                  <tr>
                    <td colSpan={3}>Summe</td>
                    <td className="zahl">{formatEuro(summeAngebot)}</td>
                    <td className="zahl">{formatEuro(summeAbgerechnet)}</td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          ) : (
            <p className="ul-leer">Keine Vorgänge in {jahr}.</p>
          )}
        </section>

        <section className="ul-abschnitt">
          <h2>Wartungen, Prüfungen und Pflege</h2>
          {plaene.length ? (
            <table className="ul-tabelle">
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Art</th>
                  <th className="zahl">Erledigt {jahr}</th>
                  <th className="zahl">Zuletzt</th>
                  <th className="zahl">Nächstes Mal</th>
                </tr>
              </thead>
              <tbody>
                {plaene.map((p) => (
                  <tr key={p.titel + p.naechste}>
                    <td>{p.titel}</td>
                    <td>{PLAN_ART_LABEL[p.art] ?? p.art}</td>
                    <td className="zahl">{p.erledigt}×</td>
                    <td className="zahl">{p.zuletzt ? formatDatum(p.zuletzt) : '—'}</td>
                    <td className="zahl">{formatDatum(p.naechste)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="ul-leer">Für dieses Objekt sind keine Pläne hinterlegt.</p>
          )}
        </section>

        <DruckFuss>Erstellt am {formatDatum(new Date().toISOString())} aus dem Arbeitsplatz von {k.org.name}</DruckFuss>
      </article>
    </div>
  )
}

async function ladePlaene(orgId: string, objektId: string, jahr: number): Promise<PlanZeile[]> {
  const { data: plaene, error } = await supabaseAdmin
    .from('teo_plaene')
    .select('id, titel, art, naechste_faelligkeit')
    .eq('kunde_id', orgId)
    .eq('kunde_objekt_id', objektId)
    .eq('aktiv', true)
    .order('titel')
  if (error) logDbError('app/bericht:plaene', error)
  if (!plaene?.length) return []
  const { data: erl, error: eErr } = await supabaseAdmin
    .from('teo_plan_erledigungen')
    .select('plan_id, erledigt_am')
    .in('plan_id', plaene.map((p) => p.id))
    .order('erledigt_am', { ascending: false })
  if (eErr) logDbError('app/bericht:erledigungen', eErr)
  return plaene.map((p) => {
    const eigene = (erl ?? []).filter((e) => e.plan_id === p.id)
    return {
      titel: String(p.titel),
      art: p.art as PlanArt,
      erledigt: eigene.filter((e) => String(e.erledigt_am).startsWith(String(jahr))).length,
      zuletzt: eigene[0] ? String(eigene[0].erledigt_am) : null,
      naechste: String(p.naechste_faelligkeit),
    }
  })
}
