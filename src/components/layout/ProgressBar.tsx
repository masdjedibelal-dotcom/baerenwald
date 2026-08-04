"use client";

import { cn } from "@/lib/utils";

export const FUNNEL_SEGMENT_LABELS = [
  "Vorhaben",
  "Details",
  "Objekt",
  "Ergebnis",
  "Termin",
] as const;

export interface ProgressBarProps {
  /** Aktiver Abschnitt 1–5 */
  currentStep: number;
  /** Abgeschlossene Abschnitte (1-basiert) — Balken in --acc */
  completedSteps: number[];
  accentColor?: string;
  className?: string;
}

export function ProgressBar({
  currentStep,
  completedSteps,
  accentColor = "#1B4332",
  className,
}: ProgressBarProps) {
  const barFill = (seg: number) => {
    if (completedSteps.includes(seg)) return accentColor;
    if (currentStep === seg) return "#888888";
    return "#e8e8e8";
  };

  return (
    <div
      className={cn(
        "fixed left-0 right-0 top-[60px] z-40 border-b border-border-default bg-surface-card px-[18px] py-3",
        className
      )}
    >
      <div className="mx-auto flex max-w-[540px] gap-1">
        {[1, 2, 3, 4, 5].map((seg) => (
          <div
            key={seg}
            className="h-[3px] min-w-0 flex-1 rounded-full"
            style={{ backgroundColor: barFill(seg) }}
          />
        ))}
      </div>
      <div className="mx-auto mt-2 flex max-w-[540px] gap-1">
        {FUNNEL_SEGMENT_LABELS.map((label, i) => {
          const seg = i + 1;
          const isActive = currentStep === seg;
          return (
            <div
              key={label}
              className="min-w-0 flex-1 text-center text-[10px] leading-tight text-[#999]"
            >
              <span
                className={cn(isActive && "font-medium")}
                style={isActive ? { color: accentColor } : undefined}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
