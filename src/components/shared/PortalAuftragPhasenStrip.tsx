"use client";

import {
  PORTAL_AUFTRAG_PHASEN,
  type PortalAuftragPhaseState,
} from "@/lib/portal/portal-auftrag-phasen";
import { cn } from "@/lib/utils";

function phaseBarClass(state: PortalAuftragPhaseState): string {
  if (state === "fertig") return "bg-emerald-600";
  if (state === "aktuell") return "bg-amber-500";
  return "bg-border-default";
}

export function PortalAuftragPhasenStrip({
  states,
  aktuellePhase,
  fortschritt,
  className,
}: {
  states: Record<(typeof PORTAL_AUFTRAG_PHASEN)[number]["id"], PortalAuftragPhaseState>;
  aktuellePhase?: string;
  fortschritt?: number;
  className?: string;
}) {
  const phaseText = [
    aktuellePhase,
    fortschritt != null ? `${fortschritt} %` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

  if (!phaseText && !PORTAL_AUFTRAG_PHASEN.length) return null;

  return (
    <div className={cn("space-y-1.5", className)} aria-label="Projektphasen">
      <div className="flex gap-1">
        {PORTAL_AUFTRAG_PHASEN.map((phase) => (
          <div
            key={phase.id}
            className={cn("h-1.5 flex-1 rounded-full", phaseBarClass(states[phase.id]))}
            title={phase.label}
          />
        ))}
      </div>
      {phaseText ? (
        <p className="portal-text-meta text-text-secondary">{phaseText}</p>
      ) : null}
    </div>
  );
}
