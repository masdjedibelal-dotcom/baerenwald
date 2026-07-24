import type { ReactNode } from "react";

import { PortalAuthFrame } from "@/components/portal/auth/PortalAuthFrame";
import { PortalRoleBadge } from "@/components/shared/PortalRoleBadge";
import {
  AUTH_INVITE,
  authBrandName,
  type AuthPortalRole,
} from "@/lib/portal2/auth";
import type { PortalRoleBadgeRole } from "@/lib/portal2/role-badge";

/**
 * TEIL F Auth-Shell — Mock `authFrame` + Body-Header.
 * Bestehende Seiten können weiter `title`/`subtitle` setzen.
 */
export function PortalAuthShell({
  title,
  subtitle,
  children,
  brand = "kunde",
  orgPrimary,
  orgPrimaryDk,
  orgSoft,
  orgName,
  orgSub,
  logoKuerzel,
  inviteRole,
  authRole,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  brand?: "kunde" | "partner" | "whitelabel";
  orgPrimary?: string | null;
  orgPrimaryDk?: string | null;
  orgSoft?: string | null;
  orgName?: string | null;
  orgSub?: string | null;
  logoKuerzel?: string | null;
  /** Mock auth invite: „Einladung von {brand} {roleBadge}“ */
  inviteRole?: PortalRoleBadgeRole | string | null;
  /** Explizite Rolle; sonst aus brand abgeleitet. */
  authRole?: AuthPortalRole;
}) {
  const role: AuthPortalRole =
    authRole ??
    (brand === "partner"
      ? "handwerker"
      : brand === "whitelabel"
        ? "mieter"
        : "kunde");

  const brandName = authBrandName(role, orgName);

  return (
    <PortalAuthFrame
      role={role}
      orgName={orgName}
      orgSub={orgSub}
      logoKuerzel={logoKuerzel}
      orgPrimary={orgPrimary}
      orgPrimaryDk={orgPrimaryDk}
      orgSoft={orgSoft}
      legalVariant={brand === "partner" ? "partner" : "kunde"}
    >
      {inviteRole ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-[12.5px] font-semibold text-text-tertiary">
            {AUTH_INVITE.eyebrow}
          </span>
          <span className="text-[13px] font-bold text-text-primary">
            {brandName}
          </span>
          <PortalRoleBadge role={inviteRole} />
        </div>
      ) : null}
      <div className="mb-6">
        <h1 className="portal-auth-heading">{title}</h1>
        {subtitle ? <p className="portal-auth-sub mt-1.5">{subtitle}</p> : null}
      </div>
      {children}
    </PortalAuthFrame>
  );
}
