import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { MieterWlBtn, MieterWlCard, MieterWlFrame } from '@/components/melden/MieterWlFrame'
import { istTeo } from '@/lib/marke'
import { loadOrgBrand } from '@/lib/org/load-org-melde-brand'
import { resolveMeldeLegalUrls } from '@/lib/org/melde-legal-urls'
import { formatDatum, formatEuro } from '@/lib/shared-domain/geld-datum'
import { createClient } from '@/lib/supabase/server'
import { ladeApKontext } from '@/teo/arbeitsplatz/kontext'
import { ladeMitteilungen, ladeObjektDokumente } from '@/teo/arbeitsplatz/daten/haus'
import { HausInfo } from '@/teo/mein/HausInfo'
import { ladeEigentuemerObjekte, ladeHausPlaene, ladeMeineMeldungen } from '@/teo/mein/mein-daten'

import '@/teo/mein/mein.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Mein Zuhause', robots: { index: false, follow: false } }

/** MeinTEO: Mieter (Meldungen) und Eigentümer (Mein Objekt) — im Branding der Verwaltung. */
export default async function MeinSeite() {
  if (!istTeo) notFound()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) redirect('/portal/login?next=/mein')

  const k = await ladeApKontext()
  if (k?.person.rolle === 'verwaltung') redirect('/arbeitsplatz')
  if (k?.person.rolle === 'team') redirect('/team')
  const eigentuemer = k?.person.rolle === 'eigentuemer' ? k : null

  const [{ meldungen, orgId, objektIds, meldeLink }, objekte] = await Promise.all([
    ladeMeineMeldungen(user.email),
    eigentuemer ? ladeEigentuemerObjekte(eigentuemer) : Promise.resolve([]),
  ])
  const hausIds = [...new Set([...objekte.map((o) => o.id), ...objektIds])]
  const hausOrgId = eigentuemer?.org.id ?? orgId
  const [plaene, mitteilungen, dokumente] = await Promise.all([
    ladeHausPlaene(hausIds),
    ladeMitteilungen(hausIds, { nurAktuell: true }),
    hausOrgId ? ladeObjektDokumente(hausOrgId, hausIds, { nurBewohner: true }) : Promise.resolve([]),
  ])

  const { orgKennung, datenschutzUrl, impressumUrl, ...brand } = await loadOrgBrand(hausOrgId)
  const legal = resolveMeldeLegalUrls({ meldeSlug: orgKennung, datenschutz_url: datenschutzUrl, impressum_url: impressumUrl })
  const hausPlaene = hausIds.flatMap((id) => plaene.get(id) ?? [])

  return (
    <MieterWlFrame brand={brand} datenschutzHref={legal.datenschutz} impressumHref={legal.impressum}>
      <div className="space-y-5">
        {objekte.map((o) => (
          <MieterWlCard key={o.id}>
            <div className="mein-objekt">
              <div className="mein-objekt__kopf">
                <div>
                  <h1 className="mieter-wl-objekt-title" style={{ fontSize: 20 }}>
                    {o.name}
                  </h1>
                  <div className="mieter-wl-objekt-item-meta">{o.adresse}</div>
                </div>
                {o.meldeLink ? (
                  <MieterWlBtn href={o.meldeLink} className="mein-melden">
                    Schaden melden
                  </MieterWlBtn>
                ) : null}
              </div>
              {o.kosten ? (
                <div className="mein-kosten">
                  <div>
                    Beauftragt {o.kosten.jahr}
                    <strong>{formatEuro(o.kosten.beauftragt)}</strong>
                  </div>
                  {o.kosten.budget != null ? (
                    <div>
                      Budget
                      <strong>{formatEuro(o.kosten.budget)}</strong>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {o.vorgaenge.length ? (
                <ul className="mein-zeilen">
                  {o.vorgaenge.map((v) => (
                    <li key={v.id}>
                      <span className="mein-zeilen__text">
                        <span className="mein-zeilen__titel block">{v.titel}</span>
                        <span className="mein-zeilen__meta block">{formatDatum(v.datum)}</span>
                      </span>
                      <span className={v.erledigt ? 'mein-pill mein-pill--fertig' : 'mein-pill'}>{v.status}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mein-leer">Keine Vorgänge</p>
              )}
            </div>
          </MieterWlCard>
        ))}

        {meldungen.length || !objekte.length ? (
          <section className="mein-abschnitt">
            <div className="mein-abschnitt__kopf">
              <h2>Meine Meldungen</h2>
              {!objekte.length && meldeLink ? (
                <MieterWlBtn href={meldeLink} className="mein-melden">
                  Neue Meldung
                </MieterWlBtn>
              ) : null}
            </div>
            {meldungen.length ? (
              <div className="mieter-wl-objekt-list">
                {meldungen.map((m) => {
                  const inhalt = (
                    <>
                      <span className="min-w-0 flex-1">
                        <span className="mieter-wl-objekt-item-title block">{m.titel}</span>
                        <span className="mieter-wl-objekt-item-meta block">{[m.objektName, formatDatum(m.datum)].filter(Boolean).join(' · ')}</span>
                      </span>
                      <span className={m.stufe === 'erledigt' ? 'mein-pill mein-pill--fertig' : 'mein-pill'}>{m.stufeLabel}</span>
                    </>
                  )
                  return m.statusLink ? (
                    <Link key={m.id} href={m.statusLink} className="mieter-wl-objekt-item">
                      {inhalt}
                    </Link>
                  ) : (
                    <div key={m.id} className="mieter-wl-objekt-item">
                      {inhalt}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="mein-leer">Noch keine Meldungen</p>
            )}
          </section>
        ) : null}

        {hausPlaene.length || mitteilungen.length || dokumente.length ? (
          <section className="mein-abschnitt">
            <h2>Im Haus</h2>
            <HausInfo mitteilungen={mitteilungen} plaene={hausPlaene} dokumente={dokumente} />
          </section>
        ) : null}

        <form action="/portal/auth/signout" method="post" className="mein-fuss">
          <button type="submit">Abmelden</button>
        </form>
      </div>
    </MieterWlFrame>
  )
}
