"use client";

import {
  portalStatusChipStyle,
  type PortalMockStatusId,
} from "@/lib/portal2/status";
import { cn } from "@/lib/utils";

type Props = {
  statusId: PortalMockStatusId;
  label?: string;
  className?: string;
};

/** Status-Chip mit Mock-STATUS-Farben — Form wie `.tag`. */
export function PortalFlowStatusChip({ statusId, label, className }: Props) {
  const style = portalStatusChipStyle(statusId);
  return (
    <span
      className={cn("tag", className)}
      style={style}
      data-portal-flow-status={statusId}
    >
      {label ?? statusId}
    </span>
  );
}
