"use client";

import { PORTAL_C } from "@/lib/portal2/tokens";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/** Listen-Eyebrow im HV-Stil (PORTAL_C). */
export function PortalListeEyebrow({ children }: { children: ReactNode }) {
  return (
    <p
      className="mb-1 text-[12px] font-semibold uppercase tracking-wide"
      style={{ color: PORTAL_C.faint }}
    >
      {children}
    </p>
  );
}

/** Listen-Seitentitel im HV-Stil (PORTAL_C). */
export function PortalListeTitle({ children }: { children: ReactNode }) {
  return (
    <h1
      className="text-[25px] font-bold"
      style={{
        color: PORTAL_C.ink,
        fontFamily: "var(--p2-font-head, " + PORTAL_C.head + ")",
      }}
    >
      {children}
    </h1>
  );
}

/** Filter-Chip im HV-Stil (PORTAL_C.greenDark aktiv). */
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
  /** Einfache Zählung in Klammern, z. B. „(3)“. */
  count?: number;
  /** HV-Stil: runder Count-Badge statt Klammer. */
  countBadge?: number | null;
}) {
  const showBadge = countBadge != null && countBadge > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold"
      )}
      style={{
        border: `1px solid ${active ? "transparent" : PORTAL_C.line}`,
        background: active ? PORTAL_C.greenDark : "#fff",
        color: active ? "#fff" : PORTAL_C.sub,
      }}
    >
      {children}
      {count != null ? (
        <span style={{ color: active ? "rgba(255,255,255,0.7)" : PORTAL_C.faint }}>
          ({count})
        </span>
      ) : null}
      {showBadge ? (
        <span
          className="rounded-full px-1.5 py-px text-[10.5px] font-bold"
          style={{
            color: active ? PORTAL_C.greenDark : "#fff",
            background: active ? "#fff" : PORTAL_C.primary,
          }}
        >
          {countBadge}
        </span>
      ) : null}
    </button>
  );
}
