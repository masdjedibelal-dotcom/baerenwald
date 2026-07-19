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
};

export type PortalHeaderProps = {
  /** Mock: Glocke (+ Slot für Suche/Abmelden) */
  notifications?: ReactNode;
  /** Desktop: Avatar 34² + Name; mobil ausgeblendet (Mock `!mobile`) */
  user?: PortalHeaderUser | null;
  actions?: ReactNode;
  className?: string;
};

/**
 * Mock `portalHeader(mobile)` — Cluster: Bell · (Desktop: Avatar + Name).
 */
export function PortalHeader({
  notifications,
  user,
  actions,
  className,
}: PortalHeaderProps) {
  const name = user?.name?.trim() || "";
  const initials =
    user?.initials?.trim() ||
    (name ? portalHeaderInitials(name) : "");

  return (
    <div className={cn("portal-header", className)} data-portal-header="">
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
          <span className="portal-header-user-name">{name}</span>
        </div>
      ) : null}

      {actions ? <div className="portal-header-actions">{actions}</div> : null}
    </div>
  );
}
