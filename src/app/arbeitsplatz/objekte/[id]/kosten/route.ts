import { NextResponse } from 'next/server'

import { ladeObjekt } from '@/teo/arbeitsplatz/daten/objekte'
import { ladeApKontext } from '@/teo/arbeitsplatz/kontext'
import { darf } from '@/teo/arbeitsplatz/rechte'
import { AP_STATUS } from '@/teo/arbeitsplatz/vorgang-status'

export const dynamic = 'force-dynamic'

function zelle(v: string | number | null | undefined): string {
  const s = v == null ? '' : String(v)
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function euro(n: number | null): string {
  return n == null ? '' : n.toFixed(2).replace('.', ',')
}

/** Kosten eines Objekts als CSV (Excel, Semikolon) — alle Vorgänge mit Betrag und Abrechnung. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const k = await ladeApKontext()
  if (!k || !darf(k.person, 'kosten.sehen')) return NextResponse.json({ error: 'Kein Zugriff.' }, { status: 403 })
  const d = await ladeObjekt(k, id)
  if (!d) return NextResponse.json({ error: 'Objekt nicht gefunden.' }, { status: 404 })

  const kopf = ['Datum', 'Vorgang', 'Status', 'Angebot brutto (EUR)', 'Abgerechnet brutto (EUR)']
  const zeilen = d.vorgaenge.map((v) => [
    v.erstellt.slice(0, 10),
    v.titel,
    AP_STATUS[v.status].label,
    euro(v.betrag),
    euro(v.abgerechnet),
  ])
  const csv = '﻿' + [kopf, ...zeilen].map((z) => z.map(zelle).join(';')).join('\r\n')
  const name = `Kosten-${d.objekt.name.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')}.csv`
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(name)}"; filename*=UTF-8''${encodeURIComponent(name)}`,
    },
  })
}
