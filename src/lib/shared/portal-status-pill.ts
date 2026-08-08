import { cn } from "@/lib/utils";

/** Einheitliche Pill-Basis (`.tag`) für alle Portale. */
export const PORTAL_STATUS_PILL_BASE = "tag";

export type PortalStatusTone =
  | "neutral"
  | "neu"
  | "warten"
  | "aktiv"
  | "fertig"
  | "danger"
  | "warn";

const TONE_CLASS: Record<PortalStatusTone, string> = {
  neutral: "bg-muted text-text-secondary",
  neu: "bg-orange-100 text-orange-800",
  warten: "bg-amber-100 text-amber-900",
  aktiv: "bg-blue-100 text-blue-800",
  fertig: "bg-emerald-100 text-emerald-700",
  danger: "bg-red-100 text-red-700",
  warn: "bg-amber-100 text-amber-800",
};

export function portalStatusPillClass(tone: PortalStatusTone): string {
  return cn(PORTAL_STATUS_PILL_BASE, TONE_CLASS[tone]);
}
