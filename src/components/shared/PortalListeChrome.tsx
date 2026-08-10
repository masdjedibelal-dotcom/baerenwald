"use client";

import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/** Listen-Eyebrow im HV-Stil (PORTAL_C). */
export function PortalListeEyebrow({ children }: { children: ReactNode }) {
  return (
    <p
      className="portal-text-label mb-1"
      style={{ color: PORTAL_VAR.faint }}
    >
      {children}
    </p>
  );
}

/** Listen-Seitentitel im HV-Stil (PORTAL_C). */
export function PortalListeTitle({ children }: { children: ReactNode }) {
  return <h1 className="portal-text-page">{children}</h1>;
}

/** Filter-Chip im HV-Stil (PORTAL_VAR.greenDark aktiv; „Offen“ = Amber). */
export function PortalListeFilterChip({
  active,
  onClick,
  children,
  count,
  countBadge,
  tone = "default",
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  /** Einfache Zählung in Klammern, z. B. „(3)“. */
  count?: number;
  /** HV-Stil: runder Count-Badge statt Klammer. */
  countBadge?: number | null;
  /** „offen“ = warmer Amber, übrige Filter = Grün. */
  tone?: "default" | "offen";
}) {
  const showBadge = countBadge != null && countBadge > 0;
  const isOffen = tone === "offen";
  const activeBg = isOffen ? "#C2410C" : PORTAL_VAR.greenDark;
  const inactiveBorder = isOffen ? "rgba(194, 65, 12, 0.35)" : PORTAL_VAR.line;
  const inactiveBg = isOffen ? "#FFF7ED" : "#fff";
  const inactiveFg = isOffen ? "#C2410C" : PORTAL_VAR.sub;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "portal-text-meta inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 font-semibold"
      )}
      style={{
        border: `1px solid ${active ? "transparent" : inactiveBorder}`,
        background: active ? activeBg : inactiveBg,
        color: active ? "#fff" : inactiveFg,
      }}
    >
      {children}
      {count != null ? (
        <span
          style={{
            color: active
              ? "rgba(255,255,255,0.7)"
              : isOffen
                ? "rgba(194, 65, 12, 0.7)"
                : PORTAL_VAR.faint,
          }}
        >
          ({count})
        </span>
      ) : null}
      {showBadge ? (
        <span
          className="rounded-full px-1.5 py-px text-[10.5px] font-bold"
          style={{
            color: active ? activeBg : "#fff",
            background: active ? "#fff" : isOffen ? "#C2410C" : PORTAL_VAR.primary,
          }}
        >
          {countBadge}
        </span>
      ) : null}
    </button>
  );
}
