'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useRef, useState, type ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { MockBtn, MockIcon, MockPopover } from '@/teo/arbeitsplatz/kit'

export type ApNavPunkt = { href: string; label: string; icon: string; zaehler?: number }

function aktiv(href: string, pfad: string): boolean {
  return href === '/arbeitsplatz' ? pfad === href : pfad === href || pfad.startsWith(`${href}/`)
}

function initialen(name: string): string {
  const t = name.replace(/[^\p{L}\s]/gu, ' ').trim().split(/\s+/)
  return ((t[0]?.[0] ?? '') + (t[1]?.[0] ?? '')).toUpperCase() || '·'
}

/** Rahmen wie im CRM: Seitenleiste, Kopfzeile, Handy-Leiste. */
export function ApShell({
  orgName,
  personName,
  personEmail,
  nav,
  zeigeEinstellungen,
  children,
}: {
  orgName: string
  personName: string
  personEmail: string
  nav: ApNavPunkt[]
  zeigeEinstellungen: boolean
  children: ReactNode
}) {
  const pfad = usePathname() ?? '/arbeitsplatz'
  const router = useRouter()
  const [menu, setMenu] = useState(false)
  const avatarRef = useRef<HTMLButtonElement>(null)
  const titel = nav.find((n) => aktiv(n.href, pfad))?.label ?? (pfad.startsWith('/arbeitsplatz/einstellungen') ? 'Einstellungen' : '')


  return (
    <div className="app">
      <nav className="sidebar" aria-label="Hauptnavigation">
        <div className="sidebar-top">
          <Link href="/arbeitsplatz" className="sidebar-brand" title={orgName}>
            <div className="sidebar-logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/teo/logo-mark-white.png" alt="" height={18} width={18} />
            </div>
            <span className="sidebar-brandname">{orgName}</span>
          </Link>
        </div>
        <div className="sidebar-nav">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              data-label={n.label}
              aria-label={n.label}
              className={cn('sidebar-icon', aktiv(n.href, pfad) && 'active')}
            >
              <MockIcon ctx="sidebar" n={n.icon} size={18} />
              <span className="sidebar-label">{n.label}</span>
              {n.zaehler ? <span className="nav-zaehler">{n.zaehler > 99 ? '99+' : n.zaehler}</span> : null}
            </Link>
          ))}
        </div>
        <div className="sidebar-spacer" />
        {zeigeEinstellungen ? (
          <Link
            href="/arbeitsplatz/einstellungen"
            aria-label="Einstellungen"
            className={cn('sidebar-icon', pfad.startsWith('/arbeitsplatz/einstellungen') && 'active')}
          >
            <MockIcon ctx="sidebar" n="settings" size={18} />
            <span className="sidebar-label">Einstellungen</span>
          </Link>
        ) : null}
      </nav>

      <div className="main">
        <div className="topbar-stack">
          <header className="topbar">
            <div className={cn('topbar-title', !titel && 'topbar-title--empty')}>
              {titel ? <span className="topbar-title-text truncate">{titel}</span> : null}
            </div>
            <div className="ap-topbar-luecke" />
            <div className="topbar-actions">
              <MockBtn
                className={cn('topbar-avatar', menu && 'is-open')}
                ref={avatarRef}
                type="button"
                aria-label="Konto"
                aria-haspopup="menu"
                aria-expanded={menu}
                onClick={() => setMenu((v) => !v)}
              >
                <span className="ap-avatar" aria-hidden>{initialen(personName)}</span>
              </MockBtn>
              <MockPopover open={menu} onClose={() => setMenu(false)} anchorRef={avatarRef} align="right" width={260}>
                <div className="topbar-user-pop__head">
                  <span className="ap-avatar ap-avatar--gross" aria-hidden>{initialen(personName)}</span>
                  <div className="topbar-user-pop__meta">
                    <div className="topbar-user-pop__name">{personName}</div>
                    <div className="topbar-user-pop__email">{personEmail}</div>
                  </div>
                </div>
                <div className="pop-sep" />
                {zeigeEinstellungen ? (
                  <MockBtn className="pop-item" type="button" onClick={() => { setMenu(false); router.push('/arbeitsplatz/einstellungen') }}>
                    <MockIcon ctx="btn" n="settings" size={16} />
                    <span>Einstellungen</span>
                  </MockBtn>
                ) : null}
                <div className="pop-sep" />
                <form action="/portal/auth/signout" method="post">
                  <MockBtn kind="danger" className="pop-item" type="submit">
                    <MockIcon n="arrow-left" ctx="default" size={16} />
                    <span>Abmelden</span>
                  </MockBtn>
                </form>
              </MockPopover>
            </div>
          </header>
        </div>
        <main className="page">
          <div className="page-inner">{children}</div>
        </main>
      </div>

      <nav className="bottomnav" aria-label="Navigation">
        {nav.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={cn('bottomnav-item', aktiv(n.href, pfad) && 'active')}
            aria-label={n.label}
            title={n.label}
          >
            <MockIcon ctx="sidebar" n={n.icon} size={20} />
            {n.zaehler ? <span className="nav-zaehler nav-zaehler--bottom">{n.zaehler > 99 ? '99+' : n.zaehler}</span> : null}
            <span className="bottomnav-item__lbl">{n.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
