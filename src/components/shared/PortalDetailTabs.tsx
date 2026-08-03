"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type PortalDetailTab = {
  id: string;
  label: string;
};

export type PortalDetailTabsProps = {
  tabs: readonly PortalDetailTab[];
  activeId: string;
  onChange: (id: string) => void;
  children: ReactNode;
  className?: string;
  /** aria-label der Tab-Navigation */
  navLabel?: string;
};

/**
 * Detail-Tabs: mobil horizontale sticky Tabs, Desktop (≥1024) linke Side-Nav + Content.
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
    <div
      className={cn(
        "flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6",
        className
      )}
    >
      <nav aria-label={navLabel} className="shrink-0 lg:w-[190px]">
        {/* Mobil: horizontale sticky Tabs */}
        <div
          className={cn(
            "sticky top-0 z-20 -mx-1 flex gap-3.5 overflow-x-auto whitespace-nowrap border-b border-border-default bg-[var(--p2-panel,#fff)]/95 px-1 pb-0.5 backdrop-blur md:gap-5",
            "lg:hidden"
          )}
        >
          {tabs.map((t) => {
            const on = activeId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onChange(t.id)}
                className={cn(
                  "shrink-0 border-b-2 pb-2.5 text-[13.5px] font-semibold",
                  on
                    ? "border-accent text-text-primary"
                    : "border-transparent text-text-secondary"
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Desktop: Side-Nav */}
        <ul className="hidden flex-col gap-0.5 lg:flex">
          {tabs.map((t) => {
            const on = activeId === t.id;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onChange(t.id)}
                  className={cn(
                    "flex w-full items-center rounded-lg px-2.5 py-2 text-left text-[13px] font-semibold transition-colors",
                    on
                      ? "bg-[var(--org-primary-soft,#E7F1E9)] text-accent"
                      : "text-text-secondary hover:bg-[var(--p2-hover,#f3f5f4)]"
                  )}
                >
                  {t.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="min-w-0 flex-1 pt-1 lg:pt-0">{children}</div>
    </div>
  );
}
