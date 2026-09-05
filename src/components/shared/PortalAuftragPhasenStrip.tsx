"use client";

import type {
  PortalFlowTimelineVariant,
  PortalMockStatusId,
} from "@/lib/portal2/status";
import { PortalFlowTimeline } from "@/components/shared/PortalFlowTimeline";
import {
  PORTAL_AUFTRAG_PHASEN,
  type PortalAuftragPhaseState,
} from "@/lib/portal/portal-auftrag-phasen";
import { cn } from "@/lib/utils";

type FlowProps = {
  flowStatus: PortalMockStatusId;
  flowTimelineVariant?: PortalFlowTimelineVariant;
  className?: string;
  /** @deprecated ignoriert — Deep Green Flow-Timeline */
  states?: never;
  aktuellePhase?: never;
  fortschritt?: never;
};

type BauProps = {
  flowStatus?: undefined;
  flowTimelineVariant?: never;
  states: Record<(typeof PORTAL_AUFTRAG_PHASEN)[number]["id"], PortalAuftragPhaseState>;
  aktuellePhase?: string;
  fortschritt?: number;
  className?: string;
};

/**
 * Deep Green: mit `flowStatus` = Vorgangs-Timeline (rollenspezifische Labels).
 * Legacy: mit `states` = Bauphasen.
 */
export function PortalAuftragPhasenStrip(props: FlowProps | BauProps) {
  if (props.flowStatus) {
    return (
      <PortalFlowTimeline
        flowStatus={props.flowStatus}
        variant={props.flowTimelineVariant ?? "hv"}
        className={props.className}
      />
    );
  }

  const { states, aktuellePhase, fortschritt, className } = props;
  const phaseText = [
    aktuellePhase,
    fortschritt != null ? `${fortschritt} %` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className={cn("portal-flow-timeline", className)}
      aria-label="Projektphasen"
    >
      <div className="portal-flow-timeline-bars" aria-hidden>
        {PORTAL_AUFTRAG_PHASEN.map((phase) => {
          const st = states[phase.id];
          const on = st === "fertig" || st === "aktuell";
          return (
            <span
              key={phase.id}
              className={cn(
                "portal-flow-timeline-bar",
                on && "portal-flow-timeline-bar--on"
              )}
              title={phase.label}
            />
          );
        })}
      </div>
      <div className="portal-flow-timeline-labels">
        {PORTAL_AUFTRAG_PHASEN.map((phase) => (
          <span key={phase.id}>{phase.label}</span>
        ))}
      </div>
      {phaseText ? (
        <p className="portal-text-meta mt-1.5 text-[var(--p2-sub)]">
          {phaseText}
        </p>
      ) : null}
    </div>
  );
}
