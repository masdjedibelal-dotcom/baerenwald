import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { istTeo } from '@/lib/marke'
import { buildMeldeUrl, generateMeldeQrPng } from '@/lib/org/melde-url'
import { formatDatum } from '@/lib/shared-domain/geld-datum'
import { supabaseAdmin } from '@/lib/supabase'
import { objektName } from '@/teo/arbeitsplatz/daten/objekte'
import { ladeApKontext } from '@/teo/arbeitsplatz/kontext'
import { darf, siehtObjekt } from '@/teo/arbeitsplatz/rechte'
import { DruckenKnopf } from '@/teo/arbeitsplatz/objekte/DruckenKnopf'

import '@/teo/arbeitsplatz/aushang.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Aushang', robots: { index: false, follow: false } }

/** Mitteilung als Aushang (A4, Browser-Druck) mit QR zum Melde-Link des Objekts. */
export default async function AushangSeite({ params }: { params: Promise<{ id: string }> }) {
  if (!istTeo) notFound()
  const { id } = await params
  const k = await ladeApKontext()
  if (!k) redirect(`/portal/login?next=/aushang/${id}`)
  if (!darf(k.person, 'objekte.bearbeiten')) notFound()

  const { data: m } = await supabaseAdmin
    .from('teo_mitteilungen')
    .select('id, kunde_objekt_id, titel, text, gueltig_bis, created_at')
    .eq('id', id)
    .eq('kunde_id', k.org.id)
    .maybeSingle()
  if (!m || !siehtObjekt(k.person, String(m.kunde_objekt_id))) notFound()

  const [{ data: o }, { data: org }] = await Promise.all([
    supabaseAdmin.from('kunden_objekte').select('titel, strasse, hausnummer, plz, ort, melde_slug, melde_aktiv').eq('id', m.kunde_objekt_id).maybeSingle(),
    supabaseAdmin.from('kunden').select('org_kennung, mieter_kontakt_telefon, mieter_kontakt_email').eq('id', k.org.id).maybeSingle(),
  ])
  let qr: string | null = null
  if (org?.org_kennung && o?.melde_slug && o.melde_aktiv !== false) {
    try {
      const png = await generateMeldeQrPng(buildMeldeUrl(String(org.org_kennung), String(o.melde_slug), { forPrint: true }), 360)
      qr = `data:image/png;base64,${Buffer.from(png).toString('base64')}`
    } catch (e) {
      console.warn('[aushang] QR:', e instanceof Error ? e.message : e)
    }
  }
  const kontakt = [org?.mieter_kontakt_telefon, org?.mieter_kontakt_email].filter(Boolean).join(' · ')

  return (
    <div className="ah-seite">
      <div className="ah-werkzeug">
        <DruckenKnopf />
      </div>
      <article className="ah-blatt">
        <header className="ah-kopf">
          <div className="ah-org">{k.org.name}</div>
          <div className="ah-objekt">
            {o ? objektName(o) : ''}
            {o ? ` · ${[o.strasse, o.hausnummer].filter(Boolean).join(' ')}, ${[o.plz, o.ort].filter(Boolean).join(' ')}` : ''}
          </div>
        </header>
        <div className="ah-datum">{formatDatum(String(m.created_at))}</div>
        <h1 className="ah-titel">{m.titel}</h1>
        {m.text ? <div className="ah-text">{m.text}</div> : null}
        {m.gueltig_bis ? <div className="ah-gueltig">Gilt bis {formatDatum(String(m.gueltig_bis))}</div> : null}
        <footer className="ah-fuss">
          {qr ? (
            <div className="ah-qr">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="" width={120} height={120} />
              <div>
                <strong>Schaden im Haus?</strong>
                <span>QR-Code scannen und melden. Dort finden Sie auch aktuelle Mitteilungen.</span>
              </div>
            </div>
          ) : null}
          {kontakt ? <div className="ah-kontakt">Fragen: {kontakt}</div> : null}
        </footer>
      </article>
    </div>
  )
}
