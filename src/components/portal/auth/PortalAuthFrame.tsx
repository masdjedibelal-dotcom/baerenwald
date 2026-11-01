"use client";

import type { ReactNode } from "react";

import { PortalAuthBrandPanel } from "@/components/portal/auth/PortalAuthBrandPanel";
import { PortalLegalFooter } from "@/components/shared/PortalLegalFooter";
import { applyBrandStyle } from "@/lib/portal2/apply-brand";
import type { AuthPortalRole } from "@/lib/portal2/auth";
import { authWL } from "@/lib/portal2/auth";
import { istTeo, MARKE } from "@/lib/marke";
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

  /* Servus TEO: wie Website und Anfrage — heller Grund mit Farbformen, Logo einmal, eine Karte */
  if (istTeo) {
    return (
      <div className={cn("portal-ui portal-auth-page portal-auth-page--teo", className)}>
        <div className="pa-teo-grund" aria-hidden="true">
          <span className="pa-teo-grund__blau" />
          <span className="pa-teo-grund__gold" />
          <span className="pa-teo-grund__rot" />
        </div>
        <a href="/" className="pa-teo-logo" aria-label={MARKE.nameLang}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/teo/logo-mark-green.png" alt="" />
        </a>
        <div className="portal-auth-frame pa-teo-karte">
          <div className="portal-auth-body">{children}</div>
        </div>
        <PortalLegalFooter variant={legalVariant} className="portal-auth-legal" showServiceBy={false} />
      </div>
    );
  }

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
        showServiceBy={wl}
      />
    </div>
  );
}
