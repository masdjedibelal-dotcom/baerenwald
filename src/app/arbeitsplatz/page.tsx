import Link from 'next/link'
import { redirect } from 'next/navigation'

import { formatDatum, formatDatumZeit } from '@/lib/shared-domain/geld-datum'
import { MockBadge, MockCard, MockEmpty, MockIcon } from '@/teo/arbeitsplatz/kit'
import { ladePlaene } from '@/teo/arbeitsplatz/daten/plaene'
import { ladeTermine } from '@/teo/arbeitsplatz/daten/termine'
import { ladeVorgaenge, type ApVorgangZeile } from '@/teo/arbeitsplatz/daten/vorgaenge'
import { ladeApKontext } from '@/teo/arbeitsplatz/kontext'
import { PLAN_STAND, planStand } from '@/teo/arbeitsplatz/plaene/plan-logik'
import { AP_STATUS } from '@/teo/arbeitsplatz/vorgang-status'

export const metadata = { title: 'Start' }

function Kachel({ href, icon, wert, label, hervor }: { href: string; icon: string; wert: number; label: string; hervor?: boolean }) {
  return (
    <Link href={href} className={hervor && wert > 0 ? 'ueber-kpi ap-kachel ap-kachel--hervor' : 'ueber-kpi ap-kachel'}>
      <div className="ueber-ico">
        <MockIcon ctx="default" n={icon} size={17} />
      </div>
      <div className="ueber-val">{wert}</div>
      <div className="ueber-label">{label}</div>
    </Link>
  )
}

function Liste({ vorgaenge }: { vorgaenge: ApVorgangZeile[] }) {
  return (
    <div className="listcard">
      {vorgaenge.map((v) => (
        <Link key={v.id} href={`/arbeitsplatz/vorgaenge/${v.id}`} className="list-row" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr) 110px' }}>
          <div className="ap-zelle-titel">
            <div className="lc-title">{v.titel}</div>
            <div className="lc-pills">
              <MockBadge kind={AP_STATUS[v.status].badge}>{AP_STATUS[v.status].label}</MockBadge>
              {v.dringend ? <MockBadge kind="storniert">Dringend</MockBadge> : null}
            </div>
          </div>
          <div className="lc-sub">{v.objektName ?? '—'}</div>
          <div className="lc-desk ap-gedimmt">{formatDatum(v.erstellt)}</div>
        </Link>
      ))}
    </div>
  )
}

export default async function StartSeite() {
  const k = await ladeApKontext()
  if (!k) redirect('/portal/login')
  const [vorgaenge, plaene] = await Promise.all([ladeVorgaenge(k), ladePlaene(k)])
  const faelligePlaene = plaene.map((p) => ({ ...p, stand: planStand(p.naechste) })).filter((p) => p.stand !== 'geplant')
  const offen = vorgaenge.filter((v) => v.status !== 'erledigt' && v.status !== 'abgelehnt')
  const termine = await ladeTermine(offen.map((v) => v.id))
  const titelVon = new Map(vorgaenge.map((v) => [v.id, v.titel]))
  const zuEntscheiden = vorgaenge.filter((v) => v.status === 'zu_entscheiden')
  const neu = vorgaenge.filter((v) => v.status === 'neu')
  const inArbeit = vorgaenge.filter((v) => v.status === 'bei_teo' || v.status === 'beauftragt' || v.status === 'termin')
  const oben = zuEntscheiden.length ? zuEntscheiden : neu

  return (
    <div className="ap-start">
      <div className="ueber-grid ap-kacheln">
        <Kachel href="/arbeitsplatz/vorgaenge?status=zu_entscheiden" icon="alert-triangle" wert={zuEntscheiden.length} label="Zu entscheiden" hervor />
        <Kachel href="/arbeitsplatz/vorgaenge?status=neu" icon="inbox" wert={neu.length} label="Neu eingegangen" hervor />
        <Kachel href="/arbeitsplatz/vorgaenge?status=bei_teo" icon="tool" wert={inArbeit.length} label="In Arbeit bei TEO" />
        <Kachel href="/arbeitsplatz/vorgaenge" icon="calendar-event" wert={termine.length} label="Termine diese Woche" />
      </div>

      <MockCard title={zuEntscheiden.length ? 'Zu entscheiden' : 'Neu eingegangen'} icon={zuEntscheiden.length ? 'alert-triangle' : 'inbox'}>
        {oben.length ? <Liste vorgaenge={oben.slice(0, 8)} /> : <MockEmpty icon="circle-check-filled" title="Alles erledigt" />}
      </MockCard>

      {faelligePlaene.length ? (
        <MockCard title="Fällige Pläne" icon="checklist">
          <div className="listcard">
            {faelligePlaene.slice(0, 8).map((p) => (
              <Link key={p.id} href={`/arbeitsplatz/plaene/${p.id}`} className="list-row" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr) 110px' }}>
                <div className="ap-zelle-titel">
                  <div className="lc-title">{p.titel}</div>
                  <div className="lc-pills">
                    <MockBadge kind={PLAN_STAND[p.stand].badge}>{PLAN_STAND[p.stand].label}</MockBadge>
                    {p.zustaendig === 'teo' ? <MockBadge kind="plain">TEO</MockBadge> : null}
                  </div>
                </div>
                <div className="lc-sub">{p.objektName}</div>
                <div className={p.stand === 'ueberfaellig' ? 'lc-desk ap-rot' : 'lc-desk'}>{formatDatum(p.naechste)}</div>
              </Link>
            ))}
          </div>
        </MockCard>
      ) : null}

      {termine.length ? (
        <MockCard title="Termine diese Woche" icon="calendar-event">
          <div className="listcard">
            {termine.map((t) => (
              <Link key={t.id} href={`/arbeitsplatz/vorgaenge/${t.leadId}`} className="list-row" style={{ gridTemplateColumns: '150px minmax(0, 1fr)' }}>
                <div className="lc-title">{formatDatumZeit(t.von)}</div>
                <div className="lc-sub">{titelVon.get(t.leadId) ?? t.titel}</div>
              </Link>
            ))}
          </div>
        </MockCard>
      ) : null}
    </div>
  )
}
