"use client";

import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { Plus } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type PortalShellNavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
};

export type PortalShellFab = {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  "aria-label"?: string;
};

export type PortalShellProps = {
  variant?: "org" | "partner" | "kunde";
  brandTitle: string;
  brandSubtitle: string;
  brandLogoUrl?: string | null;
  brandMarkSrc?: string;
  nav: PortalShellNavItem[];
  /** Mobile-Bottom-Nav; Default = `nav` */
  mobileNav?: PortalShellNavItem[];
  activeNavId: string;
  onNavChange: (id: string) => void;
  headerActions?: ReactNode;
  fab?: PortalShellFab;
  children: ReactNode;
  footer?: ReactNode;
  /** Org-WL: Primärfarbe als CSS-Variable --org-primary */
  orgPrimaryColor?: string | null;
  className?: string;
};

/**
 * Gemeinsame Portal-Shell (Design P0-1): dunkle Desktop-Sidebar, Mobile-Bottom-Nav, optional FAB.
 */
export function PortalShell({
  variant = "org",
  brandTitle,
  brandSubtitle,
  brandLogoUrl,
  brandMarkSrc = "/logo-mark-green.png",
  nav,
  mobileNav,
  activeNavId,
  onNavChange,
  headerActions,
  fab,
  children,
  footer,
  orgPrimaryColor,
  className,
}: PortalShellProps) {
  const FabIcon = fab?.icon ?? Plus;
  const bottomNav = mobileNav ?? nav;
  const shellStyle = orgPrimaryColor
    ? ({ ["--org-primary" as string]: orgPrimaryColor } as React.CSSProperties)
    : undefined;

  return (
    <div
      className={cn("portal-ui portal-shell min-h-screen bg-surface-page", className)}
      data-portal-variant={variant}
      style={shellStyle}
    >
      <header className="portal-shell-header sticky top-0 z-50">
        <div className="portal-shell-header-inner mx-auto flex h-[68px] max-w-[1200px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5 lg:hidden">
            {brandLogoUrl ? (
              <Image
                src={brandLogoUrl}
                alt=""
                width={28}
                height={28}
                className="rounded"
                unoptimized
              />
            ) : (
              <Image src={brandMarkSrc} alt="" width={28} height={28} />
            )}
            <div>
              <p className="portal-text-body font-semibold">{brandTitle}</p>
              <p className="text-xs text-text-tertiary">{brandSubtitle}</p>
            </div>
          </div>
          <div className="hidden lg:block">
            <p className="portal-text-body font-semibold text-text-primary">{brandTitle}</p>
          </div>
          {headerActions ? (
            <div className="flex items-center gap-2">{headerActions}</div>
          ) : null}
        </div>
      </header>

      <div className="portal-shell-body mx-auto grid max-w-[1200px] gap-0 px-0 lg:grid-cols-[212px_1fr] lg:gap-4 lg:px-6 lg:py-5">
        <aside className="portal-shell-sidebar hidden lg:flex lg:flex-col">
          <div className="portal-shell-brand">
            <p className="portal-shell-brand-title">{brandTitle}</p>
            <p className="portal-shell-brand-sub">{brandSubtitle.toUpperCase()}</p>
          </div>
          <nav className="portal-shell-nav flex-1" aria-label="Hauptnavigation">
            {nav.map(({ id, label, icon: Icon, badge }) => {
              const active = activeNavId === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onNavChange(id)}
                  aria-current={active ? "page" : undefined}
                  className={cn("portal-shell-nav-item", active && "portal-shell-nav-item--active")}
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    {label}
                  </span>
                  {badge != null && badge > 0 ? (
                    <span className="portal-shell-nav-badge">{badge}</span>
                  ) : null}
                </button>
              );
            })}
          </nav>
          {footer ? <div className="portal-shell-sidebar-foot">{footer}</div> : null}
        </aside>

        <main className="portal-shell-main min-w-0 space-y-4 px-4 py-5 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:px-0 lg:pb-8">
          {children}
        </main>
      </div>

      <nav className="portal-shell-mobile-nav lg:hidden" aria-label="Mobile Navigation">
        <div className="mx-auto flex max-w-[1200px]">
          {bottomNav.map(({ id, label, icon: Icon, badge }) => {
            const active = activeNavId === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onNavChange(id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "portal-shell-mobile-item",
                  active && "portal-shell-mobile-item--active"
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {label}
                {badge != null && badge > 0 ? (
                  <span className="portal-shell-mobile-badge">{badge}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </nav>

      {fab ? (
        <button
          type="button"
          className="portal-shell-fab lg:hidden"
          onClick={fab.onClick}
          aria-label={fab["aria-label"] ?? fab.label}
        >
          <FabIcon className="h-6 w-6" aria-hidden />
          <span className="sr-only">{fab.label}</span>
        </button>
      ) : null}
    </div>
  );
}
