import type { ReactNode } from "react";

import { PortalAuthFrame } from "@/components/portal/auth/PortalAuthFrame";
import { type AuthPortalRole } from "@/lib/portal2/auth";

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
  /** Explizite Rolle; sonst aus brand abgeleitet. */
  authRole?: AuthPortalRole;
}) {
  const role: AuthPortalRole =
    authRole ??
    (brand === "partner" ? "handwerker" : "kunde");

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
      <div className="mb-6">
        <h1 className="portal-auth-heading">{title}</h1>
        {subtitle ? <p className="portal-auth-sub mt-1.5">{subtitle}</p> : null}
      </div>
      {children}
    </PortalAuthFrame>
  );
}
