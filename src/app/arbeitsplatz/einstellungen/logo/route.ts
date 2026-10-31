import { randomUUID } from 'node:crypto'

import { NextResponse } from 'next/server'

import { logDbError } from '@/lib/errors/log-db-error'
import { supabaseAdmin } from '@/lib/supabase'
import { ladeApKontext } from '@/teo/arbeitsplatz/kontext'
import { darf } from '@/teo/arbeitsplatz/rechte'

const MAX_BYTES = 2 * 1024 * 1024
const ENDUNG: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }

async function berechtigt() {
  const k = await ladeApKontext()
  if (!k) return { fehler: NextResponse.json({ ok: false, fehler: 'Bitte melden Sie sich erneut an.' }, { status: 401 }) }
  if (!darf(k.person, 'einstellungen')) return { fehler: NextResponse.json({ ok: false, fehler: 'Dafür fehlt Ihnen die Berechtigung.' }, { status: 403 }) }
  return { k }
}

async function setzeLogo(orgId: string, url: string | null): Promise<boolean> {
  const { error } = await supabaseAdmin.from('kunden').update({ org_logo_url: url }).eq('id', orgId)
  if (error) logDbError('app/arbeitsplatz/einstellungen/logo', error)
  return !error
}

/** Logo der Verwaltung hochladen (Bucket logos) — erscheint auf allen Drucken. Farben gibt es bewusst nicht. */
export async function POST(req: Request) {
  const r = await berechtigt()
  if (!r.k) return r.fehler
  const form = await req.formData().catch(() => null)
  const datei = form?.get('datei')
  if (!(datei instanceof File) || !datei.size) return NextResponse.json({ ok: false, fehler: 'Bitte ein Bild wählen.' }, { status: 400 })
  if (datei.size > MAX_BYTES) return NextResponse.json({ ok: false, fehler: 'Das Logo ist größer als 2 MB.' }, { status: 400 })
  const endung = ENDUNG[datei.type]
  if (!endung) return NextResponse.json({ ok: false, fehler: 'Bitte PNG, JPG oder WebP hochladen.' }, { status: 400 })

  const pfad = `org/${r.k.org.id}/${randomUUID()}.${endung}`
  const up = await supabaseAdmin.storage.from('logos').upload(pfad, Buffer.from(await datei.arrayBuffer()), { contentType: datei.type })
  if (up.error) {
    console.error('[einstellungen/logo] upload:', up.error.message)
    return NextResponse.json({ ok: false, fehler: 'Hochladen fehlgeschlagen.' }, { status: 500 })
  }
  const url = supabaseAdmin.storage.from('logos').getPublicUrl(pfad).data.publicUrl
  if (!(await setzeLogo(r.k.org.id, url))) return NextResponse.json({ ok: false, fehler: 'Logo konnte nicht gespeichert werden.' }, { status: 500 })
  return NextResponse.json({ ok: true, url })
}

export async function DELETE() {
  const r = await berechtigt()
  if (!r.k) return r.fehler
  if (!(await setzeLogo(r.k.org.id, null))) return NextResponse.json({ ok: false, fehler: 'Logo konnte nicht entfernt werden.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
