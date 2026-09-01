"use client";

import { useEffect, useState } from "react";

import {
  PORTAL_FLOW_TIMELINE,
  type PortalMockStatusId,
} from "@/lib/portal2/status";
import { portalFlowTimeline } from "@/lib/portal2/status-mapping";
import { cn } from "@/lib/utils";

const LABELS_DESKTOP = [
  "Gemeldet",
  "Freigegeben",
  "Angebot",
  "Auftrag",
  "Rechnung",
] as const;

const LABELS_MOBILE = [
  "Neu",
  "Freigabe",
  "Angebot",
  "Auftrag",
  "Rechnung",
] as const;

/**
 * Deep Green Vorgangs-Timeline (5 Balken) — ersetzt Punkte-Kette.
 */
export function PortalFlowTimeline({
  flowStatus,
  className,
}: {
  flowStatus: PortalMockStatusId;
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

  const steps = portalFlowTimeline(flowStatus);
  const labels = mobile ? LABELS_MOBILE : LABELS_DESKTOP;
  const allDone = portalFlowTimeline(flowStatus).every((s) => s.done);

  return (
    <div
      className={cn("portal-flow-timeline", className)}
      aria-label="Vorgangsphasen"
    >
      <div className="portal-flow-timeline-bars" aria-hidden>
        {PORTAL_FLOW_TIMELINE.map((id, i) => {
          const step = steps[i];
          const on = allDone || step?.done || step?.active;
          return (
            <span
              key={id}
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
          const step = steps[i];
          const on = allDone || step?.done || step?.active;
          return (
            <span
              key={label}
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
