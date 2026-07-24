import type { ReactNode } from "react";

import { PortalAuthShell } from "@/components/portal/PortalAuthShell";

/**
 * Partner-Auth — TEIL F mit Rolle handwerker (Bärenwald-Brand, nicht WL).
 */
export function PartnerAuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <PortalAuthShell
      title={title}
      subtitle={subtitle}
      brand="partner"
      authRole="handwerker"
    >
      {children}
    </PortalAuthShell>
  );
}
