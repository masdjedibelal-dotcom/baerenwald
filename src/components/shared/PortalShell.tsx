"use client";

import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { usePortalBusy } from "@/components/shared/PortalBusyContext";
import { PortalContentBusy } from "@/components/shared/PortalContentBusy";
import { PortalCreateFabIcon } from "@/components/shared/PortalCreateFabIcon";
import { PortalDocViewerProvider } from "@/components/shared/PortalDocViewerContext";
import { PortalHeader, type PortalHeaderUser } from "@/components/shared/PortalHeader";
import { PortalNavIcon } from "@/components/shared/PortalNavIcon";
import { PortalCountBadge } from "@/components/shared/PortalNavCountBadge";
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
  /** z. B. „In Kürze“ als schräger Störer am Label */
  tag?: string;
};

export type PortalShellCreateAction = {
  /** Exakt `createLabel()` — ohne führendes „+“ (Sidebar setzt „+ “ selbst). */
  label: string;
  onClick: () => void;
};

/**
 * Shell-Capabilities je `variant` (typisch):
 * - `org` / `kunde`: oft `createAction` (Neue Anfrage/Objekt); GPT-Vollfläche mit `hideMobileChrome`.
 * - `partner` (Handwerker): meist ohne `createAction`; GPT-Section ebenfalls `hideMobileChrome`.
 * - `hideMobileChrome`: Bottom-Nav + FAB aus — z. B. GPT-Overlay/Embedded oder Fokus-Screens.
 */
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
   * Typisch org/kunde; Handwerker (`partner`) weglassen.
   */
  createAction?: PortalShellCreateAction | null;
  /**
   * Mobil: Bottom-Nav + FAB ausblenden (GPT-Vollfläche, Fokus-Screens).
   * Default false — Bottom-Nav bleibt in Details sticky am Bildschirmrand.
   */
  hideMobileChrome?: boolean;
  /**
   * Desktop: Content-Stack ohne max-width (z. B. Dashboard-Hero über volle Main-Breite).
   */
  contentFullBleed?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  /**
   * Wechselt mit Section/Detail/Filter — löst Content-Loading aus.
   * z. B. `${section}:${selectedId ?? ""}:${filter ?? ""}`
   */
  contentKey?: string;
  /** Externer Ladezustand (Refresh, Submit, …) */
  contentBusy?: boolean;
  contentBusyTitle?: string;
  contentBusyBody?: string;
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
 * Busy-Provider liegt im Portal-/Partner-Layout (Hold über Section-Wechsel).
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
  hideMobileChrome = false,
  contentFullBleed = false,
  children,
  footer,
  contentKey,
  contentBusy = false,
  contentBusyTitle,
  contentBusyBody,
  orgPrimaryColor,
  brandPrimary,
  brandPrimaryDk,
  brandSoft,
  className,
}: PortalShellProps) {
  const { busy: ctxBusy, flash } = usePortalBusy();
  const prevNavRef = useRef(activeNavId);
  const prevKeyRef = useRef(contentKey);
  const bootedRef = useRef(false);

  useEffect(() => {
    if (!bootedRef.current) {
      bootedRef.current = true;
      prevNavRef.current = activeNavId;
      prevKeyRef.current = contentKey;
      return;
    }
    let changed = false;
    if (prevNavRef.current !== activeNavId) {
      prevNavRef.current = activeNavId;
      changed = true;
    }
    if (contentKey !== undefined && prevKeyRef.current !== contentKey) {
      prevKeyRef.current = contentKey;
      changed = true;
    }
    if (changed) flash();
  }, [activeNavId, contentKey, flash]);

  /** Mobil: Dokument-Scroll → Browser darf die URL-Leiste einklappen (wie CRM). */
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("portal-doc-scroll");
    return () => root.classList.remove("portal-doc-scroll");
  }, []);

  const showContentBusy = contentBusy || ctxBusy;
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
      className={cn("portal-ui portal-shell bg-surface-page", className)}
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
                        <span className="relative min-w-0">
                          {item.label}
                          {item.tag ? (
                            <span
                              className={cn(
                                "portal-nav-stoerer",
                                active && "portal-nav-stoerer--on-light"
                              )}
                              aria-label={item.tag}
                            >
                              {item.tag}
                            </span>
                          ) : null}
                        </span>
                      </span>
                      {item.badge != null && item.badge > 0 ? (
                        <PortalCountBadge
                          count={item.badge}
                          className="portal-shell-nav-badge"
                        />
                      ) : null}
                    </button>
                  );
                })}
              </nav>
            </aside>

            <main
              className={cn(
                "portal-shell-main",
                hideMobileChrome
                  ? // Keine Bottom-Nav → kein Nav-Padding (z. B. GPT-Vollfläche)
                    "px-0 py-0 lg:px-6 lg:py-7 lg:pb-8"
                  : "px-4 py-5 pb-[var(--portal-mobile-nav-pad)] lg:px-6 lg:py-7 lg:pb-8"
              )}
            >
              <div
                className={cn(
                  "portal-page-stack relative min-h-[40vh]",
                  (hideMobileChrome || contentFullBleed) &&
                    "portal-page-stack--wide"
                )}
              >
                <div
                  className={cn(
                    "portal-page-stack-inner",
                    showContentBusy && "invisible pointer-events-none select-none"
                  )}
                  aria-hidden={showContentBusy || undefined}
                >
                  {children}
                </div>
                {showContentBusy ? (
                  <div className="absolute inset-0 z-10 flex items-start justify-center bg-[var(--surface-page,#f7f8fa)]/90 backdrop-blur-[1px]">
                    <PortalContentBusy
                      title={contentBusyTitle}
                      body={contentBusyBody}
                    />
                  </div>
                ) : null}
              </div>
            </main>
          </div>
        </div>

        {!hideMobileChrome ? (
          <>
            <nav
              className="portal-shell-mobile-nav lg:hidden"
              aria-label="Mobile Navigation"
            >
              <div className="portal-shell-mobile-nav-inner">
                {createAction && bottomNav.length >= 4 ? (
                  <>
                    {bottomNav.slice(0, 2).map((item) => {
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
                          <NavGlyph
                            item={item}
                            active={active}
                            surface="nav"
                            size={17}
                          />
                          <span>{item.label}</span>
                          {item.badge != null && item.badge > 0 ? (
                            <PortalCountBadge
                              count={item.badge}
                              variant="corner"
                              className="portal-shell-mobile-badge"
                            />
                          ) : null}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      className="portal-shell-mobile-create"
                      onClick={createAction.onClick}
                      aria-label={createAction.label}
                      title={createAction.label}
                    >
                      <span className="portal-shell-mobile-create-btn">
                        <PortalCreateFabIcon className="h-5 w-5" />
                      </span>
                      <span className="portal-shell-mobile-create-label">
                        Neu
                      </span>
                    </button>
                    {bottomNav.slice(2, 4).map((item) => {
                      const active =
                        activeNavId === item.id ||
                        (item.id === "mehr" &&
                          ["leistungen", "marktplatz", "profil"].includes(
                            activeNavId
                          ));
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
                          <NavGlyph
                            item={item}
                            active={active}
                            surface="nav"
                            size={17}
                          />
                          <span>{item.label}</span>
                          {item.badge != null && item.badge > 0 ? (
                            <PortalCountBadge
                              count={item.badge}
                              variant="corner"
                              className="portal-shell-mobile-badge"
                            />
                          ) : null}
                        </button>
                      );
                    })}
                  </>
                ) : (
                  bottomNav.map((item) => {
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
                        <NavGlyph
                          item={item}
                          active={active}
                          surface="nav"
                          size={17}
                        />
                        <span>{item.label}</span>
                        {item.badge != null && item.badge > 0 ? (
                          <PortalCountBadge
                            count={item.badge}
                            variant="corner"
                            className="portal-shell-mobile-badge"
                          />
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
            </nav>

            {createAction && bottomNav.length < 4 ? (
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
          </>
        ) : null}
      </PortalOfflineGate>
      </PortalDocViewerProvider>
    </div>
  );
}
