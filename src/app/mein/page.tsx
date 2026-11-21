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
import { TeoKontoMenue, teoKuerzel } from '@/components/shared/TeoKontoMenue'
import { HausInfo } from '@/teo/mein/HausInfo'
import { MeinVorgaengeListe } from '@/teo/mein/MeinVorgaengeListe'
import { ladeEigentuemerObjekte, ladeHausPlaene, ladeMeineMeldungen } from '@/teo/mein/mein-daten'

import '@/teo/mein/mein.css'
import '@/teo/website-look.css'

export const dynamic = 'force-dynamic'

/** Begrüßung nach Tageszeit (Berlin) — wie im Arbeitsplatz. */
function begruessung(): string {
  const teil = new Intl.DateTimeFormat('de-DE', { hour: 'numeric', hour12: false, timeZone: 'Europe/Berlin' })
    .formatToParts(new Date())
    .find((t) => t.type === 'hour')
  const stunde = Number(teil?.value ?? 12)
  return stunde < 11 ? 'Guten Morgen.' : stunde < 18 ? 'Guten Tag.' : 'Guten Abend.'
}
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
  const offeneMeldungen = meldungen.filter((m) => m.stufe !== 'erledigt').length
  const personName = String(eigentuemer?.person.name ?? user.user_metadata?.name ?? user.email).trim()

  return (
    <MieterWlFrame
      brand={brand}
      className="mein-wl"
      datenschutzHref={legal.datenschutz}
      impressumHref={legal.impressum}
      kopfRechts={<TeoKontoMenue kuerzel={teoKuerzel(personName, 'M')} name={personName} unterzeile={user.email} abmeldenAction="/portal/auth/signout" />}
    >
      <div className="space-y-5">
        <div className="wl-kopf">
          <h1>{begruessung()}</h1>
          <p>{offeneMeldungen === 1 ? 'Eine Meldung ist in Arbeit.' : offeneMeldungen ? `${offeneMeldungen} Meldungen sind in Arbeit.` : 'Alles erledigt.'}</p>
        </div>
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
            </div>
          </MieterWlCard>
        ))}

        {objekte.length ? (
          <section className="mein-abschnitt">
            <h2>Vorgänge</h2>
            <MeinVorgaengeListe
              leerText="Keine Vorgänge"
              eintraege={objekte.flatMap((o) =>
                o.vorgaenge.map((v) => ({
                  id: v.id,
                  titel: v.titel,
                  meta: [objekte.length > 1 ? o.name : null, formatDatum(v.datum)].filter(Boolean).join(' · '),
                  status: v.status,
                  erledigt: v.erledigt,
                }))
              )}
            />
          </section>
        ) : null}

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
            <MeinVorgaengeListe
              leerText="Noch keine Meldungen"
              eintraege={meldungen.map((m) => ({
                id: m.id,
                titel: m.titel,
                meta: [m.objektName, formatDatum(m.datum)].filter(Boolean).join(' · '),
                status: m.stufeLabel,
                erledigt: m.stufe === 'erledigt',
                href: m.statusLink,
              }))}
            />
          </section>
        ) : null}

        {hausPlaene.length || mitteilungen.length || dokumente.length ? (
          <section className="mein-abschnitt">
            <h2>Im Haus</h2>
            <HausInfo mitteilungen={mitteilungen} plaene={hausPlaene} dokumente={dokumente} />
          </section>
        ) : null}

      </div>
    </MieterWlFrame>
  )
}
