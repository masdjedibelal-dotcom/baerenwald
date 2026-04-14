"use client";

import { Fragment } from "react";

import { cn } from "@/lib/utils";

const LABELS = [
  "Vorhaben",
  "Details",
  "Umfang",
  "Größe",
  "Ergebnis",
] as const;

export interface FunnelProgressBarProps {
  currentStep: number;
  className?: string;
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FunnelProgressBar({
  currentStep,
  className,
}: FunnelProgressBarProps) {
  return (
    <div
      className={cn(
        "border-b border-border-default bg-surface-card px-4 py-3",
        className
      )}
    >
      <div className="mx-auto flex max-w-xl items-center">
        {LABELS.map((label, i) => {
          const step = i + 1;
          const done = step < currentStep;
          const active = step === currentStep;

          return (
            <Fragment key={label}>
              {i > 0 ? (
                <div
                  className={cn(
                    "mx-0.5 h-0.5 min-w-[8px] flex-1 rounded-full sm:mx-1",
                    step - 1 < currentStep
                      ? "bg-funnel-accent"
                      : "bg-border-default"
                  )}
                  aria-hidden
                />
              ) : null}
              <div className="flex w-12 shrink-0 flex-col items-center gap-1 sm:w-16">
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full border-2 text-xs font-medium transition-colors",
                    done &&
                      "border-funnel-accent bg-funnel-accent text-white",
                    active &&
                      "border-funnel-accent bg-surface-card text-funnel-accent",
                    !done &&
                      !active &&
                      "border-border-default bg-surface-card text-text-tertiary"
                  )}
                >
                  {done ? (
                    <CheckIcon className="text-white" />
                  ) : (
                    <span>{step}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-center text-[10px] leading-tight text-text-tertiary sm:text-xs",
                    active && "font-medium text-funnel-accent"
                  )}
                >
                  {label}
                </span>
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
