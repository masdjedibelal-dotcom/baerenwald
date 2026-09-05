'use client';

import type { ReactNode } from "react";

import { portalHeaderInitials } from "@/lib/portal2/role-badge";
import { cn } from "@/lib/utils";

export type PortalHeaderUser = {
  /** Anzeigename (Mock `who`) — real aus Auth/Stamm */
  name: string;
  /** Override Initialen; Default aus Name */
  initials?: string;
  /**
   * Mieter: Avatar-Farben aus Org-WL (`--org-primary*`).
   * Sonst: Portal-Primary-Soft / Primary.
   */
  useOrgAvatarColors?: boolean;
  /** Unter dem Namen — Rollenlabel (11/800 Uppercase), Farbe aus role-badge */
  roleLabel?: string | null;
  roleColor?: string | null;
};

export type PortalHeaderProps = {
  /** Mobil: Suchleiste; Desktop: zentriert. */
  search?: ReactNode;
  /** Glocke (+ Abmelden Desktop). */
  notifications?: ReactNode;
  /** Avatar (+ Name Desktop); mobil nur Kreis neben Glocke. */
  user?: PortalHeaderUser | null;
  actions?: ReactNode;
  className?: string;
};

/**
 * Portal-Header-Cluster:
 * Mobil: Suche (breit) · Glocke
 * Desktop: Suche zentriert · Glocke · Avatar + Name
 */
export function PortalHeader({
  search,
  notifications,
  user,
  actions,
  className,
}: PortalHeaderProps) {
  const name = user?.name?.trim() || "";
  const initials =
    user?.initials?.trim() ||
    (name ? portalHeaderInitials(name) : "");
  const roleLabel = user?.roleLabel?.trim() || "";
  const hasEnd = Boolean(notifications || (user && name) || actions);

  return (
    <div className={cn("portal-header", className)} data-portal-header="">
      {search ? (
        <div className="portal-header-search">{search}</div>
      ) : (
        <div className="portal-header-search portal-header-search--empty" aria-hidden />
      )}

      {hasEnd ? (
        <div className="portal-header-end">
          {notifications ? (
            <div className="portal-header-notifications">{notifications}</div>
          ) : null}

          {user && name ? (
            <div className="portal-header-user" data-portal-header-user="">
              <div
                className={cn(
                  "portal-header-avatar",
                  user.useOrgAvatarColors && "portal-header-avatar--org"
                )}
                aria-hidden
              >
                {initials}
              </div>
              <div className="portal-header-user-text">
                <span className="portal-header-user-name">{name}</span>
                {roleLabel ? (
                  <span
                    className="portal-header-user-role"
                    style={
                      user.roleColor ? { color: user.roleColor } : undefined
                    }
                  >
                    {roleLabel}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          {actions ? <div className="portal-header-actions">{actions}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
