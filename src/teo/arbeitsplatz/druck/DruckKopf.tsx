import 'server-only'

import type { ReactNode } from 'react'

import { logDbError } from '@/lib/errors/log-db-error'
import { supabaseAdmin } from '@/lib/supabase'

/** Logo der Verwaltung (Einstellungen → Logo). Farben gibt es bewusst nicht — Drucke sind immer im TEO-Look. */
export async function ladeOrgLogo(orgId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.from('kunden').select('org_logo_url').eq('id', orgId).maybeSingle()
  if (error) {
    logDbError('teo/arbeitsplatz/druck:org_logo_url', error)
    return null
  }
  const url = (data as { org_logo_url?: string | null } | null)?.org_logo_url?.trim()
  return url && /^https?:\/\//.test(url) ? url : null
}

/** Briefkopf aller TEO-Drucke: links die Verwaltung (Logo oder Name), rechts Dokumentart und Bezug. */
export function DruckKopf({ orgName, logoUrl, art, children }: { orgName: string; logoUrl: string | null; art?: string; children?: ReactNode }) {
  return (
    <header className="dk-kopf">
      <div className="dk-absender">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="dk-logo" src={logoUrl} alt="" />
        ) : null}
        <div className="dk-org">{orgName}</div>
      </div>
      <div className="dk-bezug">
        {art ? <div className="dk-art">{art}</div> : null}
        {children}
      </div>
    </header>
  )
}

/** Fußzeile: links frei (Kontakt, Stand …), rechts „Ein Service von teo.“ */
export function DruckFuss({ children }: { children?: ReactNode }) {
  return (
    <footer className="dk-fuss">
      <div>{children}</div>
      <div className="dk-service">
        Ein Service von
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/teo/logo-wordmark.png" alt="teo." />
      </div>
    </footer>
  )
}
