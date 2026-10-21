import 'server-only'

import { writeAuditEvent } from '@/lib/audit/write-audit-event'
import { logDbError } from '@/lib/errors/log-db-error'
import { setLeadVorgangPhase } from '@/lib/melde/mieter-status-mail'
import { notifyCrmOrgPortal } from '@/lib/org/notify-crm-org'
import { notifyHvMieterEvent } from '@/lib/org/notify-hv-mieter-event'
import { supabaseAdmin } from '@/lib/supabase'
import { hvFreigabeEntfaellt } from '@/teo/hv/freigabe-bypass'

/**
 * HV-Entscheidungen auf einem Vorgang — eine Stelle für altes Portal (API-Routen) und Arbeitsplatz.
 * Aufrufer prüft vorher Login und Recht; hier: Zugehörigkeit zur Organisation + erlaubter Zustand.
 */

export type AktionErgebnis = { ok: true; status: string } | { ok: false; status: number; error: string }

const LEAD_SPALTEN =
  'id, auftraggeber_kunde_id, kunde_id, anlass, hv_meldung_status, org_freigabe_status, freigabe_bypass_grund, funnel_daten, melder_name'

type LeadZeile = {
  id: string
  auftraggeber_kunde_id: string | null
  kunde_id: string | null
  anlass: string | null
  hv_meldung_status: string | null
  org_freigabe_status: string | null
  freigabe_bypass_grund: string | null
  funnel_daten: unknown
  melder_name: string | null
}

async function leadDerOrg(orgId: string, leadId: string): Promise<LeadZeile | null> {
  const { data, error } = await supabaseAdmin.from('leads').select(LEAD_SPALTEN).eq('id', leadId).maybeSingle()
  if (error) logDbError('teo/hv/vorgang-aktionen:leads', error)
  const lead = data as LeadZeile | null
  if (!lead || (lead.auftraggeber_kunde_id !== orgId && lead.kunde_id !== orgId)) return null
  return lead
}

function direktauftrag(funnel: unknown): boolean {
  return Boolean(funnel && typeof funnel === 'object' && !Array.isArray(funnel) && (funnel as { direktauftrag?: unknown }).direktauftrag === true)
}

function freigabeEntfaellt(lead: LeadZeile, angebotZugestellt: boolean): boolean {
  return hvFreigabeEntfaellt({
    orgFreigabeStatus: lead.org_freigabe_status,
    bypassGrund: lead.freigabe_bypass_grund,
    funnelDirektauftrag: direktauftrag(lead.funnel_daten),
    hvMeldungStatus: lead.hv_meldung_status,
    angebotZugestellt,
  }) !== null
}

async function crmBenachrichtigen(args: Parameters<typeof notifyCrmOrgPortal>[0], wo: string) {
  const r = await notifyCrmOrgPortal(args)
  if (!r.ok) console.warn(`[${wo}] CRM-Notify:`, r.error, { leadId: args.leadId, skipped: r.skipped === true })
}

/** Neue Meldung an TEO geben (neu → angebot_eingefordert). */
export async function meldungAnTeo(orgId: string, leadId: string, opts: { wirKuemmernMail?: boolean } = {}): Promise<AktionErgebnis> {
  const lead = await leadDerOrg(orgId, leadId)
  if (!lead || lead.auftraggeber_kunde_id !== orgId) return { ok: false, status: 404, error: 'Meldung nicht gefunden.' }
  if (lead.anlass !== 'meldung') return { ok: false, status: 400, error: 'Kein Meldungs-Vorgang.' }
  if ((lead.hv_meldung_status ?? 'neu').trim().toLowerCase() !== 'neu') {
    return { ok: false, status: 409, error: 'Für diese Meldung ist die Aktion nicht mehr möglich.' }
  }
  if (freigabeEntfaellt(lead, false)) return { ok: false, status: 409, error: 'Keine Freigabe notwendig (Akut oder unter Schwelle).' }

  const { error } = await supabaseAdmin.from('leads').update({ hv_meldung_status: 'angebot_eingefordert' }).eq('id', leadId)
  if (error) {
    logDbError('teo/hv/vorgang-aktionen:an-teo', error)
    return { ok: false, status: 500, error: error.message }
  }
  await crmBenachrichtigen({ leadId, typ: 'meldung' }, 'meldung-an-teo')
  if (opts.wirKuemmernMail) {
    try {
      const { notifyHvWirKuemmernUns } = await import('@/lib/org/notify-hv-wir-kuemmern')
      await notifyHvWirKuemmernUns({ leadId })
    } catch (e) {
      console.warn('[meldung-an-teo] hv wir-kuemmern:', e)
    }
  }
  return { ok: true, status: 'angebot_eingefordert' }
}

/** Neue Meldung ablehnen (nur aus neu). */
export async function meldungAblehnen(orgId: string, leadId: string): Promise<AktionErgebnis> {
  const lead = await leadDerOrg(orgId, leadId)
  if (!lead || lead.auftraggeber_kunde_id !== orgId) return { ok: false, status: 404, error: 'Meldung nicht gefunden.' }
  if (lead.anlass !== 'meldung') return { ok: false, status: 400, error: 'Kein Meldungs-Vorgang.' }
  if ((lead.hv_meldung_status ?? 'neu').trim().toLowerCase() !== 'neu') {
    return { ok: false, status: 409, error: 'Für diese Meldung ist die Aktion nicht mehr möglich.' }
  }
  if (freigabeEntfaellt(lead, false)) return { ok: false, status: 409, error: 'Keine Freigabe notwendig (Akut oder unter Schwelle).' }

  const { error } = await supabaseAdmin
    .from('leads')
    .update({ hv_meldung_status: 'abgelehnt', org_freigabe_status: 'abgelehnt', vorgang_phase: 'abgelehnt' })
    .eq('id', leadId)
  if (error) {
    logDbError('teo/hv/vorgang-aktionen:ablehnen', error)
    return { ok: false, status: 500, error: error.message }
  }
  try {
    const melder = lead.melder_name ? String(lead.melder_name) : 'Mieter'
    await notifyHvMieterEvent({
      leadId,
      typ: 'meldung_abgelehnt',
      titel: 'Meldung abgelehnt',
      body: `Die Meldung von ${melder} wurde abgelehnt und abgeschlossen. Bitte informieren Sie den Mieter bei Bedarf.`,
    })
  } catch (e) {
    console.warn('[meldung-ablehnen] notifyHvMieterEvent:', e)
  }
  await crmBenachrichtigen({ leadId, typ: 'meldung' }, 'meldung-ablehnen')
  return { ok: true, status: 'abgelehnt' }
}

export type FreigabeAktion = 'freigegeben' | 'abgelehnt' | 'beschluss_ausstehend'

function isoTag(raw: string | null | undefined): string | null {
  const s = String(raw ?? '').trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
}

/** Angebots-Freigabe der HV: freigeben, ablehnen oder auf Beschluss parken. Mit Protokoll. */
export async function freigabeEntscheiden(
  orgId: string,
  leadId: string,
  aktion: FreigabeAktion,
  opts: {
    userId: string
    rolle: string
    betragEur?: number | null
    notiz?: string | null
    beschlussAm?: string | null
    protokollUrl?: string | null
  }
): Promise<AktionErgebnis> {
  const lead = await leadDerOrg(orgId, leadId)
  if (!lead) return { ok: false, status: 404, error: 'Lead nicht gefunden.' }
  if (freigabeEntfaellt(lead, true)) return { ok: false, status: 409, error: 'Keine Freigabe notwendig (Akut oder unter Schwelle).' }

  const aktuell = (lead.org_freigabe_status ?? '').trim()
  if (aktion === 'beschluss_ausstehend') {
    if (aktuell !== 'ausstehend') return { ok: false, status: 409, error: 'Beschluss kann nur aus dem Freigabe-Status gesetzt werden.' }
  } else if (aktuell !== 'ausstehend' && aktuell !== 'beschluss_ausstehend') {
    return { ok: false, status: 409, error: 'Freigabe ist für diesen Vorgang nicht offen.' }
  }

  const beschlussAm = isoTag(opts.beschlussAm)
  const patch: Record<string, unknown> = { org_freigabe_status: aktion }
  if (aktion === 'beschluss_ausstehend') {
    if (beschlussAm) patch.beschluss_versammlung_am = beschlussAm
    if (opts.protokollUrl?.trim()) patch.beschluss_protokoll_url = opts.protokollUrl.trim()
  } else {
    patch.beschluss_versammlung_am = null
    patch.beschluss_protokoll_url = null
  }
  const { error: updErr } = await supabaseAdmin.from('leads').update(patch).eq('id', leadId)
  if (updErr) {
    logDbError('teo/hv/vorgang-aktionen:freigabe', updErr)
    return { ok: false, status: 500, error: updErr.message }
  }

  const notiz = opts.notiz?.trim() || null
  const { error: logErr } = await supabaseAdmin.from('org_freigabe_log').insert({
    lead_id: leadId,
    auftraggeber_kunde_id: orgId,
    aktion,
    betrag_eur: opts.betragEur ?? null,
    notiz,
    erstellt_von: opts.userId,
  })
  if (logErr) logDbError('teo/hv/vorgang-aktionen:org_freigabe_log', logErr)
  await writeAuditEvent({
    entityType: 'lead',
    entityId: leadId,
    aktion: aktion === 'freigegeben' ? 'org_freigabe' : aktion === 'abgelehnt' ? 'org_freigabe_abgelehnt' : 'org_freigabe_beschluss',
    actorId: opts.userId,
    actorRolle: opts.rolle,
    kundeId: orgId,
    payload: { betrag_eur: opts.betragEur ?? null, notiz, beschluss_versammlung_am: beschlussAm },
  })

  if (aktion === 'freigegeben') {
    await setLeadVorgangPhase(leadId, 'in_bearbeitung')
    await writeAuditEvent({
      entityType: 'lead',
      entityId: leadId,
      aktion: 'phase_in_bearbeitung',
      actorId: opts.userId,
      actorRolle: opts.rolle,
      kundeId: orgId,
      payload: { phase: 'in_bearbeitung' },
    })
  }
  if (aktion === 'freigegeben' || aktion === 'abgelehnt') {
    await crmBenachrichtigen({ leadId, typ: 'freigabe_ergebnis', aktion, notiz: notiz ?? undefined }, 'org/freigabe')
  }

  const titel = aktion === 'freigegeben' ? 'HV-Freigabe erteilt' : aktion === 'abgelehnt' ? 'HV-Freigabe abgelehnt' : 'Wartet auf Eigentümerbeschluss'
  const beschreibung =
    notiz ||
    (aktion === 'freigegeben'
      ? 'Hausverwaltung hat den Vorgang freigegeben.'
      : aktion === 'abgelehnt'
        ? 'Hausverwaltung hat die Freigabe abgelehnt.'
        : beschlussAm
          ? `Freigabe pausiert — Versammlung geplant am ${beschlussAm}.`
          : 'Freigabe pausiert — Eigentümerbeschluss erforderlich.')
  const { error: tlErr } = await supabaseAdmin
    .from('lead_timeline')
    .insert({ lead_id: leadId, typ: 'org_freigabe', titel, beschreibung, erstellt_von: opts.userId })
  if (tlErr) logDbError('teo/hv/vorgang-aktionen:lead_timeline', tlErr)

  return { ok: true, status: aktion }
}
