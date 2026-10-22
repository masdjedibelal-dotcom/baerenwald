import { randomUUID } from 'node:crypto'

import { NextResponse } from 'next/server'

import { logDbError } from '@/lib/errors/log-db-error'
import { supabaseAdmin } from '@/lib/supabase'
import { ladeApKontext } from '@/teo/arbeitsplatz/kontext'
import { darf, siehtObjekt } from '@/teo/arbeitsplatz/rechte'

const MAX_BYTES = 10 * 1024 * 1024
const TYPEN = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])

/** Objekt-Dokument hochladen (Bucket kunden-dokumente, Zeile in kunden_dokumente). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: objektId } = await params
  const k = await ladeApKontext()
  if (!k) return NextResponse.json({ ok: false, fehler: 'Bitte melden Sie sich erneut an.' }, { status: 401 })
  if (!darf(k.person, 'dokumente.hochladen') || !siehtObjekt(k.person, objektId)) {
    return NextResponse.json({ ok: false, fehler: 'Dafür fehlt Ihnen die Berechtigung.' }, { status: 403 })
  }
  const { data: obj } = await supabaseAdmin.from('kunden_objekte').select('id').eq('id', objektId).eq('kunde_id', k.org.id).maybeSingle()
  if (!obj) return NextResponse.json({ ok: false, fehler: 'Objekt nicht gefunden.' }, { status: 404 })

  const form = await req.formData().catch(() => null)
  const datei = form?.get('datei')
  if (!(datei instanceof File) || !datei.size) return NextResponse.json({ ok: false, fehler: 'Bitte eine Datei wählen.' }, { status: 400 })
  if (datei.size > MAX_BYTES) return NextResponse.json({ ok: false, fehler: 'Die Datei ist größer als 10 MB.' }, { status: 400 })
  if (!TYPEN.has(datei.type)) return NextResponse.json({ ok: false, fehler: 'Bitte PDF oder Bild (JPG, PNG, WebP) hochladen.' }, { status: 400 })

  const name = String(form?.get('name') ?? '').trim().slice(0, 160) || datei.name.replace(/\.[a-z0-9]+$/i, '')
  const fuerBewohner = form?.get('fuerBewohner') === '1'
  const sicher = datei.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').slice(-60)
  const pfad = `${k.org.id}/objekte/${objektId}/${randomUUID()}-${sicher}`
  const up = await supabaseAdmin.storage.from('kunden-dokumente').upload(pfad, Buffer.from(await datei.arrayBuffer()), { contentType: datei.type })
  if (up.error) {
    console.error('[objekt-dokumente] upload:', up.error.message)
    return NextResponse.json({ ok: false, fehler: 'Hochladen fehlgeschlagen.' }, { status: 500 })
  }
  const url = supabaseAdmin.storage.from('kunden-dokumente').getPublicUrl(pfad).data.publicUrl
  const { error } = await supabaseAdmin.from('kunden_dokumente').insert({
    kunde_id: k.org.id,
    kunde_objekt_id: objektId,
    name,
    typ: 'sonstiges',
    datei_url: url,
    groesse_bytes: datei.size,
    erstellt_von: k.userId || null,
    fuer_bewohner: fuerBewohner,
  })
  if (error) {
    logDbError('app/arbeitsplatz/objekte/dokumente', error)
    return NextResponse.json({ ok: false, fehler: 'Dokument konnte nicht gespeichert werden.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, url })
}
