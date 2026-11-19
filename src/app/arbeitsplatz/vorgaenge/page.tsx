import { redirect } from 'next/navigation'

import { supabaseAdmin } from '@/lib/supabase'
import { ladeVorgaenge } from '@/teo/arbeitsplatz/daten/vorgaenge'
import { ladeApKontext } from '@/teo/arbeitsplatz/kontext'
import { darf, siehtObjekt } from '@/teo/arbeitsplatz/rechte'
import { VorgaengeListe } from '@/teo/arbeitsplatz/vorgaenge/VorgaengeListe'

export const metadata = { title: 'Vorgänge' }

export default async function VorgaengeSeite() {
  const k = await ladeApKontext()
  if (!k) redirect('/portal/login')
  const [vorgaenge, objRes] = await Promise.all([
    ladeVorgaenge(k),
    supabaseAdmin.from('kunden_objekte').select('id, titel, strasse, hausnummer, zustaendig_mitglied_id').eq('kunde_id', k.org.id).order('titel'),
  ])
  const objekte = (objRes.data ?? [])
    .filter((o) => siehtObjekt(k.person, String(o.id)))
    .map((o) => ({ id: String(o.id), name: o.titel?.trim() || [o.strasse, o.hausnummer].filter(Boolean).join(' ') || 'Objekt' }))
  const meineObjektIds = k.person.mitgliedId
    ? (objRes.data ?? []).filter((o) => String(o.zustaendig_mitglied_id ?? '') === k.person.mitgliedId).map((o) => String(o.id))
    : []
  const offen = vorgaenge.filter((v) => v.status !== 'erledigt' && v.status !== 'abgelehnt').length
  return (
    <>
      <div className="wl-kopf">
        <h1>Vorgänge.</h1>
        <p>{offen === 1 ? '1 offen' : `${offen} offen`}, {vorgaenge.length - offen} erledigt.</p>
      </div>
      <VorgaengeListe
      meineObjektIds={meineObjektIds}
      vorgaenge={vorgaenge}
      objekte={objekte}
      zeigeBetrag={darf(k.person, 'kosten.sehen')}
      />
    </>
  )
}
