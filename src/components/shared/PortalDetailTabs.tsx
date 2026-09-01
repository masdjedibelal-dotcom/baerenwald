"use client";

import type { ReactNode } from "react";

import { PortalCountBadge } from "@/components/shared/PortalNavCountBadge";
import { cn } from "@/lib/utils";

export type PortalDetailTab = {
  id: string;
  label: string;
  badge?: number | null;
};

export type PortalDetailTabsProps = {
  tabs: readonly PortalDetailTab[];
  activeId: string;
  onChange: (id: string) => void;
  children: ReactNode;
  className?: string;
  navLabel?: string;
};

/**
 * Detail-Tabs — Deep Green Pills (Desktop + Mobil horizontal scrollbar).
 */
export function PortalDetailTabs({
  tabs,
  activeId,
  onChange,
  children,
  className,
  navLabel = "Abschnitte",
}: PortalDetailTabsProps) {
  return (
    <div className={cn("portal-detail-tabs", className)}>
      <nav aria-label={navLabel} className="portal-detail-tabs-nav">
        <div className="portal-detail-tabs-row" role="tablist">
          {tabs.map((t) => {
            const on = activeId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => onChange(t.id)}
                className={cn(
                  "portal-detail-tab",
                  on && "portal-detail-tab--active"
                )}
              >
                {t.label}
                <PortalCountBadge count={t.badge ?? 0} />
              </button>
            );
          })}
        </div>
      </nav>

      <div className="portal-detail-tabs-panel" role="tabpanel">
        {children}
      </div>
    </div>
  );
}
