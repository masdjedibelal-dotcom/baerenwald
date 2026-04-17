"use client";

import { Fragment } from "react";

import {
  getB2BFunnelProgressStep,
  isB2bProgressSituation,
} from "@/lib/funnel/bw-funnel-progress";
import type { Situation } from "@/lib/funnel/types";
import { cn } from "@/lib/utils";

const LABELS = [
  "Vorhaben",
  "Umfang",
  "Details",
  "Fast fertig",
  "Ergebnis",
] as const;

const B2B_PROGRESS_STEPS = [
  { label: "Vorhaben" },
  { label: "Anfrage" },
] as const;

export interface FunnelProgressBarProps {
  currentStep: number | null;
  situation?: Situation | null;
  activeScreen?: string;
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
  situation = null,
  activeScreen = "",
  className,
}: FunnelProgressBarProps) {
  const isB2B =
    isB2bProgressSituation(situation) &&
    (activeScreen === "situation" ||
      activeScreen === "beratung-lead" ||
      activeScreen === "danke");

  if (isB2B) {
    const currentB2BStep = getB2BFunnelProgressStep(activeScreen);
    return (
      <div
        className={cn(
          "funnel-progress funnel-progress--b2b border-b border-border-default bg-surface-card px-4 py-3",
          className
        )}
      >
        <div className="funnel-progress-b2b-inner mx-auto flex max-w-sm items-center">
          {B2B_PROGRESS_STEPS.map((s, i) => {
            const done = currentB2BStep > i + 1;
            const active = currentB2BStep === i + 1;
            return (
              <Fragment key={s.label}>
                {i > 0 ? (
                  <div
                    className={cn(
                      "progress-connector mx-0.5 h-0.5 min-w-[12px] flex-1 rounded-full sm:mx-1",
                      i <= currentB2BStep - 1
                        ? "bg-funnel-accent"
                        : "bg-border-default"
                    )}
                    aria-hidden
                  />
                ) : null}
                <div className="progress-step flex w-16 shrink-0 flex-col items-center gap-1 sm:w-20">
                  <div
                    className={cn(
                      "progress-dot flex size-8 items-center justify-center rounded-full border-2 text-xs font-medium transition-colors",
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
                      <span>{i + 1}</span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "progress-label text-center text-[10px] leading-tight text-text-tertiary sm:text-xs",
                      active && "font-medium text-funnel-accent"
                    )}
                  >
                    {s.label}
                  </span>
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>
    );
  }

  if (currentStep === null) return null;

  return (
    <div
      className={cn(
        "funnel-progress border-b border-border-default bg-surface-card px-4 py-3",
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
