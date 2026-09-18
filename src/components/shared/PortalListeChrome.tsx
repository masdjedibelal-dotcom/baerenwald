"use client";

import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/** Listen-Eyebrow — Deep Green 11.5/800 Uppercase `#7A857F`. */
export function PortalListeEyebrow({ children }: { children: ReactNode }) {
  return <p className="portal-liste-eyebrow">{children}</p>;
}

/** Listen-Seitentitel — Deep Green H1 30/800. */
export function PortalListeTitle({ children }: { children: ReactNode }) {
  return <h1 className="portal-liste-title">{children}</h1>;
}

/** Filter-Chip — aktiv `#1A3D2B`, inaktiv weiß ohne Border. */
export function PortalListeFilterChip({
  active,
  onClick,
  children,
  count,
  countBadge,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  count?: number;
  countBadge?: number | null;
}) {
  const showBadge = countBadge != null && countBadge > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "portal-liste-chip",
        active && "portal-liste-chip--active"
      )}
    >
      {children}
      {count != null ? (
        <span
          className="portal-liste-chip-count"
          style={{
            color: active ? "rgba(255,255,255,0.7)" : PORTAL_VAR.faint,
          }}
        >
          ({count})
        </span>
      ) : null}
      {showBadge ? (
        <span
          className="portal-liste-chip-badge"
          style={{
            color: active ? PORTAL_VAR.greenDark : "#1a2e1f",
            background: active ? "#fff" : "var(--p2-sand, #e8b04b)",
          }}
        >
          {countBadge}
        </span>
      ) : null}
    </button>
  );
}
