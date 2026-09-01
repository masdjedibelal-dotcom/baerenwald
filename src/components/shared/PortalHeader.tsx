"use client";

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
  /** Mobil: Suchleiste links (über Header-Bild). */
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
 * Mobil: Suche · Glocke · Avatar
 * Desktop: (Suche) · Glocke · Avatar + Name · Actions
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

  return (
    <div className={cn("portal-header", className)} data-portal-header="">
      {search ? (
        <div className="portal-header-search">{search}</div>
      ) : null}

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
  );
}
