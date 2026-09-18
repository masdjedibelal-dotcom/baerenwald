import { cn } from "@/lib/utils";

/**
 * Einheitlicher Zähler (Glocke, Nav, Listen, Tabs) — Mock-Badge `#D93B3B`.
 * `corner` = oben rechts am Icon; sonst inline neben dem Label.
 */
export function PortalCountBadge({
  count,
  variant = "inline",
  className,
}: {
  count: number;
  variant?: "inline" | "corner";
  className?: string;
}) {
  if (count <= 0) return null;
  const label = count > 99 ? "99+" : String(count);
  return (
    <span
      className={cn(
        "portal-count-badge",
        variant === "corner" && "portal-count-badge--corner",
        className
      )}
      aria-hidden
    >
      {label}
    </span>
  );
}

/** Kleine Zähler-Badge oben rechts am Nav-Icon (nur wenn count &gt; 0). */
export function PortalNavCountBadge({ count }: { count: number }) {
  return <PortalCountBadge count={count} variant="corner" />;
}

export type PortalNavBadgeCounts = {
  offen?: number;
  freigabe?: number;
  vorgaenge?: number;
  anfragen: number;
  angebote: number;
  auftraege: number;
};

export function portalNavBadgeCount(
  id: string,
  counts: PortalNavBadgeCounts
): number {
  if (id === "offen" || id === "freigabe") {
    return counts.freigabe ?? counts.offen ?? 0;
  }
  if (id === "vorgaenge") {
    return counts.vorgaenge ?? 0;
  }
  if (id === "anfragen") return counts.anfragen;
  if (id === "angebote") return counts.angebote;
  if (id === "auftraege") return counts.auftraege;
  return 0;
}
