import type { RolePillSemantic } from "@/lib/crm-vorgang/role-status";
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

/** Design P0-2: eine Farbfamilie für Portal- + Role-Pills (`.role-pill-*`). */
const TONE_CLASS: Record<PortalStatusTone, string> = {
  neutral: "role-pill role-pill-fertig",
  neu: "role-pill role-pill-neu",
  warten: "role-pill role-pill-warten",
  aktiv: "role-pill role-pill-aktiv",
  fertig: "role-pill role-pill-fertig",
  danger: "role-pill role-pill-storniert",
  warn: "role-pill role-pill-warten",
};

export function portalStatusPillClass(tone: PortalStatusTone): string {
  return cn(PORTAL_STATUS_PILL_BASE, TONE_CLASS[tone]);
}

/** Resolver-Semantik → Portal-Tone (für `PortalStatusPill`). */
export function roleSemanticToPortalTone(
  semantic: RolePillSemantic
): PortalStatusTone {
  switch (semantic) {
    case "neu":
      return "neu";
    case "warten":
      return "warten";
    case "aktiv":
      return "aktiv";
    case "fertig":
      return "fertig";
    case "storniert":
      return "danger";
  }
}
