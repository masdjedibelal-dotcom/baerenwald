import type { Metadata, Viewport } from 'next'
import { notFound, redirect } from 'next/navigation'

import '@/teo/arbeitsplatz/kit/tokens.css'
import '@/teo/arbeitsplatz/kit/crm.css'
import '@/teo/arbeitsplatz/kit/utilities.css'
import '@/teo/arbeitsplatz/arbeitsplatz.css'

import { istTeo } from '@/lib/marke'
import { ladeApKontext } from '@/teo/arbeitsplatz/kontext'
import { TeamShell } from '@/teo/team/TeamShell'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: { template: '%s | Servus TEO', default: 'Team | Servus TEO' },
  robots: { index: false, follow: false },
}

export const viewport: Viewport = { themeColor: '#0f172a' }

export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  if (!istTeo) notFound()
  const k = await ladeApKontext()
  if (!k) redirect('/portal/login?next=/team')
  if (k.person.rolle === 'verwaltung') redirect('/arbeitsplatz')
  if (k.person.rolle !== 'team') redirect('/portal')
  return (
    <TeamShell orgName={k.org.name} personName={k.person.name}>
      {children}
    </TeamShell>
  )
}
