import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";
import {
  portalStatusPillClass,
  type PortalStatusTone,
} from "@/lib/shared/portal-status-pill";
import {
  getPortalRoleBadge,
  type PortalRoleBadgeRole,
} from "@/lib/portal2/role-badge";
import {
  portalStatusChipStyle,
  portalStatusMeta,
  type PortalMockStatusId,
} from "@/lib/portal2/status";

type Props = {
  label: string;
  tone?: PortalStatusTone;
  className?: string;
  /** Optional inline-Farben (Flow-/Rollen-Chips). */
  style?: CSSProperties;
};

/** Einheitliche Status-Pill für alle Portale. */
export function PortalStatusPill({
  label,
  tone = "neutral",
  className,
  style,
}: Props) {
  return (
    <span className={cn(portalStatusPillClass(tone), className)} style={style}>
      {label}
    </span>
  );
}

export type PortalRoleBadgeProps = {
  role: PortalRoleBadgeRole | string;
  className?: string;
};

/**
 * Rollen-Badge — basiert auf PortalStatusPill (Mock `roleBadge`).
 * Implementierung hier, damit keine zweite Status-Variante zählt.
 */
export function PortalRoleBadge({ role, className }: PortalRoleBadgeProps) {
  const style = getPortalRoleBadge(role);
  return (
    <PortalStatusPill
      label={style.label}
      className={cn("portal-role-badge", className)}
      style={{ color: style.color, background: style.bg }}
    />
  );
}

type FlowChipProps = {
  statusId: PortalMockStatusId;
  label?: string;
  className?: string;
};

/** Flow-Status — Alias auf PortalStatusPill mit Mock-STATUS-Farben. */
export function PortalFlowStatusChip({
  statusId,
  label,
  className,
}: FlowChipProps) {
  const meta = portalStatusMeta(statusId);
  const chipStyle = portalStatusChipStyle(statusId);
  return (
    <span data-portal-flow-status={statusId}>
      <PortalStatusPill
        label={label ?? meta.label}
        className={className}
        style={chipStyle}
      />
    </span>
  );
}
