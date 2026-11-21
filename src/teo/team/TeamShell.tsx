'use client'

import Link from 'next/link'

import { TeoKontoMenue, teoKuerzel } from '@/components/shared/TeoKontoMenue'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { MockIcon } from '@/teo/arbeitsplatz/kit'

const NAV = [
  { href: '/team', label: 'Heute', icon: 'circle-check-filled' },
  { href: '/team/plaene', label: 'Pläne', icon: 'checklist' },
  { href: '/team/melden', label: 'Melden', icon: 'alert-triangle' },
]

/** Team-App (Hausmeister, Reinigung): nur Handy-Rahmen, drei Punkte. */
export function TeamShell({ orgName, personName, children }: { orgName: string; personName: string; children: ReactNode }) {
  const pfad = usePathname() ?? '/team'
  const aktiv = (href: string) => (href === '/team' ? pfad === href : pfad.startsWith(href))
  return (
    <div className="tm-app ap-wl">
      <header className="tm-kopf">
        <div className="tm-kopf__marke">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/teo/logo-mark-white.png" alt="" height={18} width={18} />
        </div>
        <div className="tm-kopf__text">
          <div className="tm-kopf__org">{orgName}</div>
          <div className="tm-kopf__name">{personName}</div>
        </div>
        {/* Kontomenü wie im Arbeitsplatz: Plakette oben rechts, Popover mit Abmelden */}
        <TeoKontoMenue kuerzel={teoKuerzel(personName, "T")} name={personName} unterzeile={orgName} abmeldenAction="/portal/auth/signout" />
      </header>
      <main className="tm-inhalt">{children}</main>
      <nav className="tm-nav" aria-label="Navigation">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={cn('tm-nav__punkt', aktiv(n.href) && 'is-aktiv')} aria-current={aktiv(n.href) ? 'page' : undefined}>
            <MockIcon ctx="nav" n={n.icon} size={20} />
            <span>{n.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
