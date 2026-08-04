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

/** Status-Chip mit Mock-STATUS-Farben (A4). */
export function PortalFlowStatusChip({ statusId, label, className }: Props) {
  const style = portalStatusChipStyle(statusId);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-semibold",
        className
      )}
      style={style}
      data-portal-flow-status={statusId}
    >
      {label ?? statusId}
    </span>
  );
}
