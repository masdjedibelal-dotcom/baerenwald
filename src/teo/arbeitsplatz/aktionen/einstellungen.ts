'use server'

import { revalidatePath } from 'next/cache'

import { writeAuditEvent } from '@/lib/audit/write-audit-event'
import { logDbError } from '@/lib/errors/log-db-error'
import { ensureOrgKennung } from '@/lib/org/ensure-org-kennung'
import { normalizeOrgHttpUrl } from '@/lib/org/melde-legal-urls'
import { supabaseAdmin } from '@/lib/supabase'
import type { ApAktionsErgebnis } from '@/teo/arbeitsplatz/aktionen/vorgang'
import { ladeApKontext } from '@/teo/arbeitsplatz/kontext'
import { darf } from '@/teo/arbeitsplatz/rechte'
import { normalizeAkutFallIds } from '@/teo/hv/sofortmassnahme-faelle'

export type EinstellungenFelder = {
  anzeigename: string
  orgTyp: 'hv' | 'weg'
  freigabeSchwelle: string
  akutFallIds: string[]
  impressumUrl: string
  datenschutzUrl: string
}

function betrag(v: string): number | null {
  const s = v.trim()
  if (!s) return null
  const n = Number(s.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null
}

export async function einstellungenSpeichern(f: EinstellungenFelder): Promise<ApAktionsErgebnis> {
  const k = await ladeApKontext()
  if (!k) return { ok: false, fehler: 'Bitte melden Sie sich erneut an.' }
  if (!darf(k.person, 'einstellungen')) return { ok: false, fehler: 'Dafür fehlt Ihnen die Berechtigung.' }
  const impressum = f.impressumUrl.trim() ? normalizeOrgHttpUrl(f.impressumUrl) : null
  const datenschutz = f.datenschutzUrl.trim() ? normalizeOrgHttpUrl(f.datenschutzUrl) : null
  if ((f.impressumUrl.trim() && !impressum) || (f.datenschutzUrl.trim() && !datenschutz)) {
    return { ok: false, fehler: 'Bitte gültige Links (https://…) für Impressum und Datenschutz eingeben.' }
  }
  const patch = {
    org_anzeigename: f.anzeigename.trim().slice(0, 120) || null,
    org_typ: f.orgTyp === 'weg' ? 'weg' : 'hv',
    freigabe_schwelle_eur: betrag(f.freigabeSchwelle),
    akut_fall_ids: normalizeAkutFallIds(f.akutFallIds),
    impressum_url: impressum,
    datenschutz_url: datenschutz,
  }
  const { error } = await supabaseAdmin.from('kunden').update(patch).eq('id', k.org.id)
  if (error) {
    logDbError('teo/arbeitsplatz/aktionen/einstellungen', error)
    return { ok: false, fehler: 'Einstellungen konnten nicht gespeichert werden.' }
  }
  if (impressum && datenschutz) await ensureOrgKennung({ id: k.org.id })
  await writeAuditEvent({
    entityType: 'kunde',
    entityId: k.org.id,
    aktion: 'org_einstellungen_aktualisiert',
    actorId: k.userId,
    actorRolle: 'verwaltung',
    payload: patch,
  })
  revalidatePath('/arbeitsplatz', 'layout')
  return { ok: true }
}
