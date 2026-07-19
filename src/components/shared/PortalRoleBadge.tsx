"use client";

import {
  getPortalRoleBadge,
  type PortalRoleBadgeRole,
} from "@/lib/portal2/role-badge";
import { cn } from "@/lib/utils";

export type PortalRoleBadgeProps = {
  role: PortalRoleBadgeRole | string;
  className?: string;
};

/**
 * Mock `roleBadge(r)` — Pill 11.5px / padding 3×10 / radius 99.
 */
export function PortalRoleBadge({ role, className }: PortalRoleBadgeProps) {
  const style = getPortalRoleBadge(role);
  return (
    <span
      className={cn("portal-role-badge", className)}
      style={{
        color: style.color,
        background: style.bg,
      }}
    >
      {style.label}
    </span>
  );
}
