"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { PortalDetailCover } from "@/components/shared/PortalDetailCover";
import { PortalFlowTimeline } from "@/components/shared/PortalFlowTimeline";
import {
  PortalDetailTabs,
  type PortalDetailTab,
} from "@/components/shared/PortalDetailTabs";
import { PortalDetailHead } from "@/components/shared/PortalDetailUi";
import { PortalDetailLayoutFooterContext } from "@/components/shared/portal-detail-layout-context";
import type { PortalFlowTimelineVariant, PortalMockStatusId } from "@/lib/portal2/status";
import { useIsPortalMobile } from "@/lib/portal2/use-is-portal-mobile";
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
  /** Unter Meta/Timeline in der Kopfkarte (z. B. gelber Hinweis). */
  kopfBanner?: ReactNode;
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
  kopfBanner,
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
    <div
      className={cn(
        "portal-detail-layout portal-entity-detail flex flex-col pb-2",
        className
      )}
    >
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
        {kopfBanner ? (
          <div className="portal-detail-kopfkarte-banner">{kopfBanner}</div>
        ) : null}
      </div>

      <div className="portal-detail-body-pad flex flex-col gap-4 pb-6 pt-4 sm:pt-5">
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

/** Sticky-Footer-Rahmen um Entity-Detail (Mobile-CTA-Portal). */
export function PortalDetailLayout({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const isMobile = useIsPortalMobile();
  const hasCta = Boolean(footer);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const root = document.body;
    if (!isMobile || !hasCta) {
      root.classList.remove("has-portal-detail-cta");
      return;
    }
    root.classList.add("has-portal-detail-cta");
    return () => {
      root.classList.remove("has-portal-detail-cta");
    };
  }, [isMobile, hasCta]);

  const mobileBar =
    mounted && isMobile && footer
      ? createPortal(
          <div className="portal-detail-mobile-cta" role="toolbar" aria-label="Aktionen">
            <div className="portal-detail-mobile-cta__inner">{footer}</div>
          </div>,
          document.body
        )
      : null;

  return (
    <PortalDetailLayoutFooterContext.Provider value={footer ?? null}>
      <div className="flex flex-col">
        <div className="portal-detail-layout space-y-5 pb-2">{children}</div>
        {mobileBar}
      </div>
    </PortalDetailLayoutFooterContext.Provider>
  );
}
