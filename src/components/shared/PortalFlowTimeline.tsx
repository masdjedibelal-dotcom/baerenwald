"use client";

import { useEffect, useState } from "react";

import {
  PORTAL_FLOW_TIMELINE,
  portalFlowTimelineLabels,
  type PortalFlowTimelineVariant,
  type PortalMockStatusId,
} from "@/lib/portal2/status";
import {
  portalFlowTimeline,
  portalMieterFlowTimeline,
} from "@/lib/portal2/status-mapping";
import { cn } from "@/lib/utils";

/**
 * Deep Green Vorgangs-Timeline (5 Balken) — Labels je Portal-Typ.
 * HV: mit Freigabe · Privat/Eigentümer: ohne · Mieter: STG · HM: Ausführung.
 */
export function PortalFlowTimeline({
  flowStatus,
  variant = "hv",
  className,
}: {
  flowStatus: PortalMockStatusId;
  /** Default hv (Freigabe). Privat/Eigentümer: `privat`. */
  variant?: PortalFlowTimelineVariant;
  className?: string;
}) {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const isMieter = variant === "mieter";
  const mieterSteps = isMieter ? portalMieterFlowTimeline(flowStatus) : null;
  const hvSteps = isMieter ? null : portalFlowTimeline(flowStatus);
  const labels = portalFlowTimelineLabels(variant, mobile);
  const allDone = isMieter
    ? Boolean(mieterSteps?.every((s) => s.done))
    : Boolean(hvSteps?.every((s) => s.done));

  return (
    <div
      className={cn("portal-flow-timeline", className)}
      aria-label="Vorgangsphasen"
      data-timeline-variant={variant}
    >
      <div className="portal-flow-timeline-bars" aria-hidden>
        {(isMieter ? mieterSteps! : PORTAL_FLOW_TIMELINE).map((idOrStep, i) => {
          const step = isMieter ? mieterSteps![i] : hvSteps![i];
          const on = allDone || step?.done || step?.active;
          const key =
            typeof idOrStep === "string" ? idOrStep : idOrStep.id;
          return (
            <span
              key={key}
              className={cn(
                "portal-flow-timeline-bar",
                on && "portal-flow-timeline-bar--on"
              )}
            />
          );
        })}
      </div>
      <div className="portal-flow-timeline-labels">
        {labels.map((label, i) => {
          const step = isMieter ? mieterSteps![i] : hvSteps![i];
          const on = allDone || step?.done || step?.active;
          return (
            <span
              key={`${label}-${i}`}
              className={cn(on && "portal-flow-timeline-label--on")}
            >
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
