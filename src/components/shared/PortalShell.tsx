"use client";

import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { usePortalBusy } from "@/components/shared/PortalBusyContext";
import { PortalContentBusy } from "@/components/shared/PortalContentBusy";
import { PortalDocViewerProvider } from "@/components/shared/PortalDocViewerContext";
import { PortalHeader, type PortalHeaderUser } from "@/components/shared/PortalHeader";
import { PortalLegalFooter } from "@/components/shared/PortalLegalFooter";
import { MockIcon } from "@/components/shared/MockIcon";
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
  /** z. B. „In Kürze“ — Inline-Badge hinter dem Label */
  tag?: string;
};

export type PortalShellCreateAction = {
  /** Exakt `createLabel()` — ohne führendes „+“ (Sidebar setzt Icon). */
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
 * Gemeinsame Portal-Shell: Topbar + Sidebar + Bottom-Nav-Pill (Deep Green).
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

  useEffect(() => {
    const root = document.body;
    if (!showContentBusy) {
      root.classList.remove("portal-shell-busy");
      return;
    }
    root.classList.add("portal-shell-busy");
    return () => root.classList.remove("portal-shell-busy");
  }, [showContentBusy]);

  const bottomNav = mobileNav ?? nav;
  const shellStyle = applyBrandStyle({
    primary: brandPrimary ?? orgPrimaryColor,
    primaryDk: brandPrimaryDk,
    soft: brandSoft,
  });
  const notifSlot = notifications ?? headerActions;
  const ownerRaw =
    sidebarOwner ?? (typeof footer === "string" ? footer : null) ?? brandTitle;
  const owner = ownerRaw.trim() || brandTitle;
  const kuerzel = (
    brandKuerzel?.trim() ||
    brandTitle.trim().charAt(0) ||
    "B"
  )
    .slice(0, 2)
    .toUpperCase();
  const roleLabel = brandSubtitle.trim() || "Portal";
  const legalVariant =
    variant === "partner" ? "partner" : variant === "kunde" ? "kunde" : "org";
  const createLabel = createAction?.label.replace(/^\+\s*/, "").trim() || "";

  const topbarRight =
    headerSearch || notifSlot || headerUser ? (
      <PortalHeader
        search={headerSearch}
        notifications={notifSlot}
        user={headerUser}
      />
    ) : null;

  function renderMobileNavItem(item: PortalShellNavItem) {
    const active =
      activeNavId === item.id ||
      (item.id === "mehr" &&
        ["leistungen", "marktplatz", "profil"].includes(activeNavId));
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => onNavChange(item.id)}
        aria-current={active ? "page" : undefined}
        aria-label={item.label}
        className={cn(
          "portal-shell-mobile-item",
          active && "portal-shell-mobile-item--active"
        )}
      >
        <span className="portal-shell-mobile-item-icon">
          <NavGlyph item={item} active={active} surface="nav" size={active ? 17 : 19} />
          {item.badge != null && item.badge > 0 && !active ? (
            <PortalCountBadge
              count={item.badge}
              variant="corner"
              className="portal-shell-mobile-badge"
            />
          ) : null}
        </span>
        {active ? (
          <span className="portal-shell-mobile-item-label">{item.label}</span>
        ) : null}
        {active && item.badge != null && item.badge > 0 ? (
          <PortalCountBadge
            count={item.badge}
            className="portal-shell-nav-badge"
          />
        ) : null}
      </button>
    );
  }

  function renderMobileCreate() {
    if (!createAction || !createLabel) return null;
    return (
      <button
        type="button"
        className="portal-shell-mobile-create"
        onClick={createAction.onClick}
        aria-label={createLabel}
        title={createLabel}
      >
        <span className="portal-shell-mobile-create-btn">
          <MockIcon n="plus" ctx="nav" size={20} className="text-white" />
        </span>
      </button>
    );
  }

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
                  <div className="portal-shell-brand-avatar" aria-hidden>
                    {brandLogoUrl || brandMarkSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element -- WL-Logo dynamisch
                      <img
                        src={brandLogoUrl || brandMarkSrc || ""}
                        alt=""
                        className="portal-shell-brand-avatar-img"
                      />
                    ) : (
                      kuerzel
                    )}
                  </div>
                  <div className="portal-shell-brand-text">
                    <p className="portal-shell-brand-title">{owner}</p>
                    <p className="portal-shell-brand-role">{roleLabel}</p>
                  </div>
                </div>

                {createAction && createLabel ? (
                  <button
                    type="button"
                    className="portal-shell-create"
                    onClick={createAction.onClick}
                  >
                    <MockIcon n="plus" ctx="nav" size={17} className="portal-shell-create-icon text-white" />
                    <span>{createLabel}</span>
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
                            size={17}
                          />
                          <span className="portal-shell-nav-item-label">
                            {item.label}
                            {item.tag ? (
                              <span className="portal-nav-tag" aria-label={item.tag}>
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

                <div className="portal-shell-sidebar-foot">
                  {headerRoleBadge ? (
                    <div className="portal-shell-sidebar-signout">{headerRoleBadge}</div>
                  ) : null}
                  <PortalLegalFooter
                    variant={legalVariant}
                    showServiceBy={variant === "kunde"}
                    className="portal-shell-sidebar-legal"
                  />
                </div>
              </aside>

              <main
                className={cn(
                  "portal-shell-main",
                  hideMobileChrome
                    ? "portal-shell-main--chrome-hidden"
                    : "portal-shell-main--padded"
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
                    <div
                      className="absolute inset-0 z-[80] bg-[var(--surface-page,#f5f6f4)]/92 backdrop-blur-[2px]"
                      role="presentation"
                    >
                      <div className="sticky top-[max(1rem,18vh)] flex justify-center px-3 py-6">
                        <PortalContentBusy
                          className="!min-h-0 !py-8"
                          title={
                            contentBusyTitle ??
                            (ctxBusy && !contentBusy
                              ? "Wird verarbeitet…"
                              : undefined)
                          }
                          body={
                            contentBusyBody ??
                            (ctxBusy && !contentBusy
                              ? "Einen Moment bitte."
                              : undefined)
                          }
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </main>
            </div>
          </div>

          {!hideMobileChrome ? (
            <nav
              className="portal-shell-mobile-nav lg:hidden"
              aria-label="Mobile Navigation"
            >
              <div className="portal-shell-mobile-nav-pill">
                {createAction && bottomNav.length >= 4 ? (
                  <>
                    {bottomNav.slice(0, 2).map(renderMobileNavItem)}
                    {renderMobileCreate()}
                    {bottomNav.slice(2, 4).map(renderMobileNavItem)}
                  </>
                ) : (
                  <>
                    {bottomNav.map(renderMobileNavItem)}
                    {createAction ? renderMobileCreate() : null}
                  </>
                )}
              </div>
            </nav>
          ) : null}
        </PortalOfflineGate>
      </PortalDocViewerProvider>
    </div>
  );
}
