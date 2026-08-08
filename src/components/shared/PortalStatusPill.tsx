import { cn } from "@/lib/utils";
import {
  portalStatusPillClass,
  type PortalStatusTone,
} from "@/lib/shared/portal-status-pill";

type Props = {
  label: string;
  tone?: PortalStatusTone;
  className?: string;
};

/** Einheitliche Status-Pill für alle Portale. */
export function PortalStatusPill({
  label,
  tone = "neutral",
  className,
}: Props) {
  return (
    <span className={cn(portalStatusPillClass(tone), className)}>{label}</span>
  );
}
