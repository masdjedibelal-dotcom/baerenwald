import { cn } from "@/lib/utils";

/**
 * Einheitlicher Zähler (Glocke, Nav, Listen, Tabs) — Mock-Badge `p2-danger`.
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
