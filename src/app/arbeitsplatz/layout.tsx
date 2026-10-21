import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import '@/teo/arbeitsplatz/kit/tokens.css'
import '@/teo/arbeitsplatz/kit/crm.css'
import '@/teo/arbeitsplatz/kit/utilities.css'
import '@/teo/arbeitsplatz/arbeitsplatz.css'

import { istTeo } from '@/lib/marke'
import { ladeApKontext } from '@/teo/arbeitsplatz/kontext'
import { darf } from '@/teo/arbeitsplatz/rechte'
import { ApShell, type ApCta, type ApNavPunkt } from '@/teo/arbeitsplatz/shell/ApShell'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: { template: '%s | Servus TEO', default: 'Arbeitsplatz | Servus TEO' },
  robots: { index: false, follow: false },
}

export default async function ArbeitsplatzLayout({ children }: { children: React.ReactNode }) {
  if (!istTeo) notFound()
  const kontext = await ladeApKontext()
  if (!kontext) redirect('/portal/login?next=/arbeitsplatz')
  const { person, org } = kontext
  // Team und Eigentümer haben eigene Oberflächen
  if (!darf(person, 'arbeitsplatz')) redirect('/portal')

  const nav: ApNavPunkt[] = [
    { href: '/arbeitsplatz', label: 'Start', icon: 'layout-dashboard' },
    { href: '/arbeitsplatz/vorgaenge', label: 'Vorgänge', icon: 'clipboard-list' },
    { href: '/arbeitsplatz/objekte', label: 'Objekte', icon: 'building' },
    { href: '/arbeitsplatz/plaene', label: 'Pläne', icon: 'checklist' },
    ...(darf(person, 'team.verwalten') ? [{ href: '/arbeitsplatz/team', label: 'Team', icon: 'users' }] : []),
  ]

  const neuerVorgang = { label: 'Neuer Vorgang', href: '/arbeitsplatz/vorgaenge/neu', icon: 'plus' }
  const ctas: ApCta[] = [
    ...(darf(person, 'vorgang.anlegen')
      ? [{ bereich: '/arbeitsplatz', ...neuerVorgang }, { bereich: '/arbeitsplatz/vorgaenge', ...neuerVorgang }]
      : []),
    ...(darf(person, 'objekte.bearbeiten') ? [{ bereich: '/arbeitsplatz/objekte', label: 'Objekt', href: '/arbeitsplatz/objekte?neu=1', icon: 'plus' }] : []),
    ...(darf(person, 'team.verwalten') ? [{ bereich: '/arbeitsplatz/team', label: 'Einladen', href: '/arbeitsplatz/team?neu=1', icon: 'user-plus' }] : []),
  ]

  return (
    <ApShell
      ctas={ctas}
      orgName={org.name}
      personName={person.name}
      personEmail={person.email}
      nav={nav}
      zeigeEinstellungen={darf(person, 'einstellungen')}
    >
      {children}
    </ApShell>
  )
}
