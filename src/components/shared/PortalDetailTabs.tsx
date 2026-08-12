"use client";

import type { ReactNode } from "react";

import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { cn } from "@/lib/utils";

export type PortalDetailTab = {
  id: string;
  label: string;
  /** Optional Badge (z. B. ungelesene Einträge) */
  badge?: number | null;
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
 * Detail-Tabs — überall wie HV-Vorgang:
 * mobil horizontale Chip-Tabs (grün soft), Desktop linke Side-Nav.
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
      <nav
        aria-label={navLabel}
        className={cn(
          "shrink-0 lg:w-[190px]",
          "sticky top-0 z-20 -mx-4 bg-white/95 px-4 py-2.5 backdrop-blur",
          "border-b lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none"
        )}
        style={{ borderColor: PORTAL_VAR.line2 }}
      >
        {/* Mobil: Chip-Tabs (HV-Pattern) */}
        <div
          className="flex gap-1.5 overflow-x-auto pb-0.5 lg:hidden"
          role="tablist"
        >
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
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors",
                  on
                    ? "bg-[var(--org-primary-soft,var(--p2-primary-soft,#e7f1e9))]"
                    : "bg-[var(--p2-selected,#f0f2f0)]"
                )}
                style={{
                  color: on ? PORTAL_VAR.primary : PORTAL_VAR.sub,
                }}
              >
                {t.label}
                {t.badge && t.badge > 0 ? (
                  <span
                    className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white"
                  >
                    {t.badge > 9 ? "9+" : t.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Desktop: Side-Nav */}
        <ul className="hidden flex-col gap-0.5 lg:flex" role="tablist">
          {tabs.map((t) => {
            const on = activeId === t.id;
            return (
              <li key={t.id} role="presentation">
                <button
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => onChange(t.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[13.5px] font-semibold transition-colors",
                    on
                      ? "bg-[var(--org-primary-soft,var(--p2-primary-soft,#E7F1E9))]"
                      : "hover:bg-[var(--p2-hover)]"
                  )}
                  style={{
                    color: on ? PORTAL_VAR.primary : PORTAL_VAR.sub,
                  }}
                >
                  <span>{t.label}</span>
                  {t.badge && t.badge > 0 ? (
                    <span
                      className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white"
                    >
                      {t.badge > 9 ? "9+" : t.badge}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="min-w-0 flex-1 pt-1 lg:pt-0" role="tabpanel">
        {children}
      </div>
    </div>
  );
}
