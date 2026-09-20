/**
 * Portal-Bridge für sync'te CRM-Dateien, die `@/lib/types` erwarten.
 * Nicht sync't — nur Import-Ziel nach Rewrite.
 */
export type { OrgFreigabeStatus } from '@/lib/org/types'
import type { OrgFreigabeStatus } from '@/lib/org/types'

/** Struktureller Lead-Slice für anfrage-akut-schwelle (Pick-Felder). */
export type Lead = {
  situation?: string | null
  funnel_daten?: unknown
  freigabe_bypass_grund?: string | null
  org_freigabe_status?: OrgFreigabeStatus | null
  erfassung_von?: string | null
  anlass?: string | null
  hv_meldung_status?: string | null
  preis_min?: number | null
  preis_max?: number | null
  auftraggeber_kunde_id?: string | null
}
