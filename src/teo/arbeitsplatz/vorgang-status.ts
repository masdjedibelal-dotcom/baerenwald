import type { ResolvedVorgang } from '@/lib/crm-vorgang/types'
import { isOrgFreigabeOffen } from '@/teo/hv/org-freigabe-status'

/**
 * Der EINE Status-Wortschatz im Arbeitsplatz (Liste, Detail, Start, Mails).
 * Abgeleitet aus resolveVorgang (CRM) + den HV-Feldern am Lead.
 */
export type ApStatus = 'neu' | 'beim_team' | 'zu_entscheiden' | 'bei_teo' | 'termin' | 'beauftragt' | 'erledigt' | 'abgelehnt'

export const AP_STATUS: Record<ApStatus, { label: string; badge: string }> = {
  neu: { label: 'Neu', badge: 'neu' },
  beim_team: { label: 'Beim Team', badge: 'warten' },
  zu_entscheiden: { label: 'Zu entscheiden', badge: 'warten' },
  bei_teo: { label: 'Bei TEO', badge: 'plain' },
  termin: { label: 'Termin', badge: 'plain' },
  beauftragt: { label: 'Beauftragt', badge: 'plain' },
  erledigt: { label: 'Erledigt', badge: 'aktiv' },
  abgelehnt: { label: 'Abgelehnt', badge: 'storniert' },
}

/** Reihenfolge der Filter-Chips */
export const AP_STATUS_FILTER: ApStatus[] = ['neu', 'beim_team', 'zu_entscheiden', 'bei_teo', 'beauftragt', 'erledigt']

export function apStatus(
  lead: { hv_meldung_status?: string | null; org_freigabe_status?: string | null; funnel_daten?: unknown },
  v: Pick<ResolvedVorgang, 'phase' | 'unterstatus'>
): ApStatus {
  const hv = (lead.hv_meldung_status ?? '').trim()
  const u = v.unterstatus
  if (hv === 'abgelehnt' || u === 'storniert' || u === 'abgebrochen' || (v.phase === 'angebot' && u === 'abgelehnt')) {
    return 'abgelehnt'
  }
  if (hv === 'neu') {
    const fd = lead.funnel_daten as { team?: { ergebnis?: string } } | null | undefined
    return fd?.team && !fd.team.ergebnis ? 'beim_team' : 'neu'
  }
  if (isOrgFreigabeOffen(lead.org_freigabe_status)) return 'zu_entscheiden'
  if (hv === 'abgeschlossen' || v.phase === 'rechnung' || (v.phase === 'auftrag' && (u === 'abnahme' || u === 'abgeschlossen'))) {
    return 'erledigt'
  }
  if (v.phase === 'auftrag') return 'beauftragt'
  if (v.phase === 'anfrage' && u === 'termin') return 'termin'
  return 'bei_teo'
}
