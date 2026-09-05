"use client";

import type { ReactNode } from "react";

import { PortalDetailCover } from "@/components/shared/PortalDetailCover";
import { PortalFlowTimeline } from "@/components/shared/PortalFlowTimeline";
import {
  PortalDetailTabs,
  type PortalDetailTab,
} from "@/components/shared/PortalDetailTabs";
import { PortalDetailHead } from "@/components/shared/PortalDetailUi";
import type { PortalFlowTimelineVariant, PortalMockStatusId } from "@/lib/portal2/status";
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
  statusColor?: string;
  statusPillClass?: string;
  statusPillStyle?: { color: string; backgroundColor: string };
  /** Deep Green Flow-Timeline */
  flowStatus?: PortalMockStatusId | null;
  /** Timeline-Labels je Portal-Typ (Default hv). */
  flowTimelineVariant?: PortalFlowTimelineVariant;
  actions?: ReactNode;
  tabs?: readonly PortalDetailTab[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  tabsNavLabel?: string;
  children: ReactNode;
  coverClassName?: string;
  className?: string;
  layout?: "default" | "hv";
};

/**
 * Entity-Detail: Hero (Titel) → Kopfkarte (Meta+Timeline+Actions) → Tabs.
 */
export function PortalEntityDetailLayout({
  coverUrl,
  onBack,
  backLabel = "← Zurück",
  onEdit,
  editLabel,
  title,
  metaLine,
  flowStatus,
  flowTimelineVariant = "hv",
  actions,
  tabs,
  activeTab,
  onTabChange,
  tabsNavLabel,
  children,
  coverClassName,
  className,
}: PortalEntityDetailLayoutProps) {
  const useTabs =
    Boolean(tabs?.length) &&
    typeof activeTab === "string" &&
    typeof onTabChange === "function";

  return (
    <div className={cn("portal-entity-detail", className)}>
      <PortalDetailCover
        coverUrl={coverUrl}
        onBack={onBack}
        backLabel={backLabel}
        onEdit={onEdit}
        editLabel={editLabel}
        className={cn("portal-detail-cover--bleed", coverClassName)}
        title={title}
      />

      <div className="portal-detail-kopfkarte">
        <PortalDetailHead
          title={title}
          hideTitle
          metaLine={metaLine}
          timeline={
            flowStatus ? (
              <PortalFlowTimeline
                flowStatus={flowStatus}
                variant={flowTimelineVariant}
              />
            ) : null
          }
          actions={actions}
        />
      </div>

      <div className="portal-entity-detail-body">
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
