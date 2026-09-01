"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  compact?: boolean;
  action?: ReactNode;
  className?: string;
};

/**
 * Gestrichelter Inbox-Leerzustand für Panels/Listen-Abschnitte.
 * Für Seiten-/Rollen-Empty: `PortalEmptyState` aus PortalStateView.
 */
export function PortalInboxEmpty({
  title,
  description,
  compact,
  action,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "portal-inbox-empty flex flex-col items-center justify-center text-center",
        compact ? "px-4 py-6" : "px-5 py-8",
        className
      )}
    >
      <p
        className={cn(
          "font-bold text-[var(--p2-ink,#142019)]",
          compact ? "text-[14.5px]" : "text-[15.5px]"
        )}
      >
        {title}
      </p>
      {description ? (
        <p className="mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-[var(--p2-sub,#55615b)]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
