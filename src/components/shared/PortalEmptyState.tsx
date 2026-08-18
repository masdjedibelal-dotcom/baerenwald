"use client";

import { Inbox } from "lucide-react";
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
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border-light bg-muted/15 text-center",
        compact ? "px-3 py-6" : "px-4 py-10",
        className
      )}
    >
      <Inbox
        className={cn(
          "mb-2 text-text-tertiary",
          compact ? "h-5 w-5" : "h-7 w-7"
        )}
        aria-hidden
      />
      <p
        className={cn(
          "font-semibold text-text-primary",
          compact ? "portal-text-meta" : "portal-text-section"
        )}
      >
        {title}
      </p>
      {description ? (
        <p className="portal-text-meta mt-1 max-w-sm text-text-secondary">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
