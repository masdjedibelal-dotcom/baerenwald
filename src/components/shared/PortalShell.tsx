"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { PortalCreateFabIcon } from "@/components/shared/PortalCreateFabIcon";
import { PortalDocViewerProvider } from "@/components/shared/PortalDocViewerContext";
import { PortalHeader, type PortalHeaderUser } from "@/components/shared/PortalHeader";
import { PortalNavIcon } from "@/components/shared/PortalNavIcon";
import { PortalOfflineGate } from "@/components/shared/PortalOfflineGate";
import { PortalTopbar } from "@/components/shared/PortalTopbar";
import { applyBrandStyle } from "@/lib/portal2/apply-brand";
import type { PortalNavKey } from "@/lib/portal2/nav-items";
import { cn } from "@/lib/utils";

export type PortalShellNavItem = {
  id: string;
  label: string;
  /** Mock `navItems` Key → PortalNavIcon (bevorzugt). */
  navKey?: PortalNavKey | string;
  /** Fallback Lucide, wenn kein navKey. */
  icon?: LucideIcon;
  badge?: number;
};

export type PortalShellCreateAction = {
  /** Exakt `createLabel()` — ohne führendes „+“ (Sidebar setzt „+ “ selbst). */
  label: string;
  onClick: () => void;
};

export type PortalShellProps = {
  variant?: "org" | "partner" | "kunde";
  brandTitle: string;
  brandSubtitle: string;
  brandLogoUrl?: string | null;
  brandMarkSrc?: string;
  /** Mark-Buchstabe wenn kein Logo (Mock topbar „B“) */
  brandKuerzel?: string | null;
  /**
   * Sidebar-Owner-Zeile (Mock `sidebar` uppercase).
   * Default: `footer` oder `brandTitle`.
   */
  sidebarOwner?: string | null;
  nav: PortalShellNavItem[];
  /** Mobile-Bottom-Nav; Default = `nav` (gleiche Einträge wie Sidebar). */
  mobileNav?: PortalShellNavItem[];
  activeNavId: string;
  onNavChange: (id: string) => void;
  /**
   * Topbar/PortalHeader rechts — B4 Glocke; B5 Avatar+Name daneben (Desktop).
   * Abmelden weiter im Slot erlaubt.
   */
  notifications?: ReactNode;
  /** @deprecated Prefer `notifications` */
  headerActions?: ReactNode;
  /**
   * Suchleiste im Header (Mobil links neben Glocke/Avatar).
   */
  headerSearch?: ReactNode;
  /**
   * Mock `portalHeader` User-Chip (Avatar + Name), Desktop sichtbar.
   * Name real aus Auth/Stamm — kein Demo-Fake.
   */
  headerUser?: PortalHeaderUser | null;
  /**
   * Optional: Rollen-Badge-Anzeige im Header (Mock nur in Auth-Invite).
   * Default aus; Clients können `headerRoleBadge` setzen.
   */
  headerRoleBadge?: ReactNode;
  /**
   * Mock `canCreate` + `createLabel`: Sidebar-Button + Mobile-FAB (rechts).
   * Handwerker: weglassen (`portalCanCreate` = false).
   */
  createAction?: PortalShellCreateAction | null;
  children: ReactNode;
  footer?: ReactNode;
  /** Org-WL: Primärfarbe (Legacy); bevorzugt brandPrimary/Dk/Soft */
  orgPrimaryColor?: string | null;
  brandPrimary?: string | null;
  brandPrimaryDk?: string | null;
  brandSoft?: string | null;
  className?: string;
};

function NavGlyph({
  item,
  active,
  surface,
  size,
}: {
  item: PortalShellNavItem;
  active: boolean;
  surface: "sidebar" | "nav";
  size: number;
}) {
  if (item.navKey) {
    return (
      <PortalNavIcon
        navId={item.navKey}
        active={active}
        surface={surface}
        size={size}
      />
    );
  }
  if (item.icon) {
    const Icon = item.icon;
    return <Icon className="shrink-0" style={{ width: size, height: size }} aria-hidden />;
  }
  return null;
}

/**
 * Gemeinsame Portal-Shell: Topbar (B1) + Sidebar (B2) + Bottom-Nav (B3) + Mobile-FAB.
 */
export function PortalShell({
  variant = "org",
  brandTitle,
  brandSubtitle,
  brandLogoUrl,
  brandMarkSrc,
  brandKuerzel,
  sidebarOwner,
  nav,
  mobileNav,
  activeNavId,
  onNavChange,
  notifications,
  headerActions,
  headerSearch,
  headerUser,
  headerRoleBadge,
  createAction,
  children,
  footer,
  orgPrimaryColor,
  brandPrimary,
  brandPrimaryDk,
  brandSoft,
  className,
}: PortalShellProps) {
  const bottomNav = mobileNav ?? nav;
  const shellStyle = applyBrandStyle({
    primary: brandPrimary ?? orgPrimaryColor,
    primaryDk: brandPrimaryDk,
    soft: brandSoft,
  });
  const notifSlot = notifications ?? headerActions;
  const ownerRaw = sidebarOwner ?? (typeof footer === "string" ? footer : null) ?? brandTitle;
  const owner = ownerRaw.trim() || brandTitle;

  const topbarRight =
    headerSearch || notifSlot || headerUser || headerRoleBadge ? (
      <PortalHeader
        search={headerSearch}
        notifications={notifSlot}
        user={headerUser}
        actions={headerRoleBadge}
      />
    ) : null;

  return (
    <div
      className={cn("portal-ui portal-shell min-h-screen bg-surface-page", className)}
      data-portal-variant={variant}
      style={shellStyle}
    >
      <PortalDocViewerProvider>
      <PortalOfflineGate>
        <PortalTopbar
          brandTitle={brandTitle}
          brandSubtitle={brandSubtitle}
          brandLogoUrl={brandLogoUrl}
          brandMarkSrc={brandMarkSrc}
          brandKuerzel={brandKuerzel}
          notifications={topbarRight}
        />

        <div className="portal-shell-body">
          <div className="portal-shell-frame">
            <aside className="portal-shell-sidebar">
              <div className="portal-shell-brand">
                <p className="portal-shell-brand-owner">{owner}</p>
              </div>

              {createAction ? (
                <button
                  type="button"
                  className="portal-shell-create"
                  onClick={createAction.onClick}
                >
                  + {createAction.label}
                </button>
              ) : null}

              <nav className="portal-shell-nav flex-1" aria-label="Hauptnavigation">
                {nav.map((item) => {
                  const active = activeNavId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onNavChange(item.id)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "portal-shell-nav-item",
                        active && "portal-shell-nav-item--active"
                      )}
                    >
                      <span className="portal-shell-nav-item-main">
                        <NavGlyph
                          item={item}
                          active={active}
                          surface="sidebar"
                          size={16}
                        />
                        {item.label}
                      </span>
                      {item.badge != null && item.badge > 0 ? (
                        <span className="portal-shell-nav-badge">{item.badge}</span>
                      ) : null}
                    </button>
                  );
                })}
              </nav>
            </aside>

            <main className="portal-shell-main px-4 py-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:px-6 lg:py-5 lg:pb-8">
              <div className="portal-page-stack">{children}</div>
            </main>
          </div>
        </div>

        <nav className="portal-shell-mobile-nav lg:hidden" aria-label="Mobile Navigation">
          <div className="portal-shell-mobile-nav-inner">
            {bottomNav.map((item) => {
              const active = activeNavId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavChange(item.id)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "portal-shell-mobile-item",
                    active && "portal-shell-mobile-item--active"
                  )}
                >
                  <NavGlyph item={item} active={active} surface="nav" size={17} />
                  <span>{item.label}</span>
                  {item.badge != null && item.badge > 0 ? (
                    <span className="portal-shell-mobile-badge">{item.badge}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </nav>

        {createAction ? (
          <button
            type="button"
            className="portal-shell-fab lg:hidden"
            onClick={createAction.onClick}
            aria-label={createAction.label}
            title={createAction.label}
          >
            <PortalCreateFabIcon />
          </button>
        ) : null}
      </PortalOfflineGate>
      </PortalDocViewerProvider>
    </div>
  );
}
