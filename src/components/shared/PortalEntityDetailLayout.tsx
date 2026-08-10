"use client";

import type { ReactNode } from "react";

import { PortalDetailCover } from "@/components/shared/PortalDetailCover";
import {
  PortalDetailTabs,
  type PortalDetailTab,
} from "@/components/shared/PortalDetailTabs";
import { PortalDetailHead } from "@/components/shared/PortalDetailUi";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { cn } from "@/lib/utils";

export type PortalEntityDetailLayoutProps = {
  coverUrl?: string | null;
  onBack: () => void;
  backLabel?: string;
  onEdit?: () => void;
  editLabel?: string;
  title: string;
  metaLine?: string;
  statusLabel?: string;
  statusPillClass?: string;
  statusPillStyle?: { color: string; backgroundColor: string };
  /** CTA-Zeile im Head (Desktop rechts). */
  actions?: ReactNode;
  tabs?: readonly PortalDetailTab[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  /** aria-label der Tab-Navigation */
  tabsNavLabel?: string;
  children: ReactNode;
  /** Extra-Klassen fürs Cover (z. B. Bleed `-mx-4`). */
  coverClassName?: string;
  className?: string;
  /**
   * `default` = Head + Tabs im gemeinsamen Padding-Block.
   * `hv` = wie Hausverwaltung: Titel im weißen Kasten, Tabs darunter (Side-Nav / Chip-Tabs).
   */
  layout?: "default" | "hv";
};

/**
 * Einheitliches Entity-Detail: Cover → Head → optional Tabs um children.
 */
export function PortalEntityDetailLayout({
  coverUrl,
  onBack,
  backLabel,
  onEdit,
  editLabel,
  title,
  metaLine,
  statusLabel,
  statusPillClass,
  statusPillStyle,
  actions,
  tabs,
  activeTab,
  onTabChange,
  tabsNavLabel,
  children,
  coverClassName,
  className,
  layout = "default",
}: PortalEntityDetailLayoutProps) {
  const useTabs =
    Boolean(tabs?.length) &&
    typeof activeTab === "string" &&
    typeof onTabChange === "function";

  if (layout === "hv") {
    return (
      <div className={cn("flex flex-col", className)}>
        <PortalDetailCover
          coverUrl={coverUrl}
          onBack={onBack}
          backLabel={backLabel}
          onEdit={onEdit}
          editLabel={editLabel}
          className={coverClassName}
        />

        <div
          className="bg-white px-4 py-4 sm:px-6"
          style={{ borderBottom: `1px solid ${PORTAL_VAR.line2}` }}
        >
          <PortalDetailHead
            title={title}
            metaLine={metaLine}
            statusLabel={statusLabel}
            statusPillClass={statusPillClass}
            statusPillStyle={statusPillStyle}
            actions={actions}
          />
        </div>

        <div className="px-4 pb-6 pt-3 sm:px-6 sm:pt-4">
          {useTabs && tabs && activeTab && onTabChange ? (
            <PortalDetailTabs
              tabs={tabs}
              activeId={activeTab}
              onChange={onTabChange}
              navLabel={tabsNavLabel}
            >
              {children}
            </PortalDetailTabs>
          ) : (
            children
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-0", className)}>
      <PortalDetailCover
        coverUrl={coverUrl}
        onBack={onBack}
        backLabel={backLabel}
        onEdit={onEdit}
        editLabel={editLabel}
        className={coverClassName}
      />

      <div className="mt-4 mb-5 space-y-4 px-4 lg:px-6">
        <PortalDetailHead
          title={title}
          metaLine={metaLine}
          statusLabel={statusLabel}
          statusPillClass={statusPillClass}
          statusPillStyle={statusPillStyle}
          actions={actions}
        />

        {useTabs && tabs && activeTab && onTabChange ? (
          <PortalDetailTabs
            tabs={tabs}
            activeId={activeTab}
            onChange={onTabChange}
            navLabel={tabsNavLabel}
          >
            {children}
          </PortalDetailTabs>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
