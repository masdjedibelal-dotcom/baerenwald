"use client";

import type { ReactNode } from "react";

import { PortalAuthBrandPanel } from "@/components/portal/auth/PortalAuthBrandPanel";
import { PortalLegalFooter } from "@/components/shared/PortalLegalFooter";
import { applyBrandStyle } from "@/lib/portal2/apply-brand";
import type { AuthPortalRole } from "@/lib/portal2/auth";
import { authWL } from "@/lib/portal2/auth";
import { cn } from "@/lib/utils";

type Props = {
  role: AuthPortalRole;
  children: ReactNode;
  orgName?: string | null;
  orgSub?: string | null;
  logoKuerzel?: string | null;
  orgPrimary?: string | null;
  orgPrimaryDk?: string | null;
  orgSoft?: string | null;
  className?: string;
  legalVariant?: "kunde" | "partner";
};

/**
 * Mock `authFrame` Kern: Brand-Panel + Body (ohne Demo-Rollen-Pills).
 */
export function PortalAuthFrame({
  role,
  children,
  orgName,
  orgSub,
  logoKuerzel,
  orgPrimary,
  orgPrimaryDk,
  orgSoft,
  className,
  legalVariant = "kunde",
}: Props) {
  const wl = authWL(role);
  const brandStyle = wl
    ? applyBrandStyle({
        primary: orgPrimary,
        primaryDk: orgPrimaryDk,
        soft: orgSoft,
      })
    : undefined;

  return (
    <div
      className={cn("portal-ui portal-auth-page", className)}
      style={brandStyle}
    >
      <div className="portal-auth-frame">
        <PortalAuthBrandPanel
          role={role}
          orgName={orgName}
          orgSub={orgSub}
          logoKuerzel={logoKuerzel}
          primaryDk={orgPrimaryDk}
        />
        <div className="portal-auth-body">{children}</div>
      </div>
      <PortalLegalFooter
        variant={legalVariant}
        className="portal-auth-legal"
      />
    </div>
  );
}
