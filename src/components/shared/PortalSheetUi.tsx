"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type PortalSheetStep = {
  id: string;
  label: string;
};

/** Mehrstufige Sheets — gleiche Typo/Farben wie Portal-Flows. */
export function PortalSheetStepProgress({
  steps,
  stepIndex,
}: {
  steps: readonly PortalSheetStep[];
  stepIndex: number;
}) {
  return (
    <div className="portal-sheet-steps" aria-hidden>
      {steps.map((s, i) => {
        const done = i < stepIndex;
        const active = i === stepIndex;
        return (
          <div key={s.id} className="portal-sheet-steps__col">
            <div
              className={cn(
                "portal-sheet-steps__bar",
                done && "is-done",
                active && "is-active"
              )}
            />
            <span
              className={cn(
                "portal-sheet-steps__label",
                active && "is-active"
              )}
            >
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Text-Option ohne Icon — wie „Neue Anfrage“, nur schmaler Inhalt. */
export function PortalSheetOption({
  title,
  subtitle,
  onClick,
  disabled,
}: {
  title: string;
  subtitle?: string | null;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="portal-sheet-option portal-sheet-option--simple"
      disabled={disabled}
      onClick={onClick}
    >
      <span className="portal-sheet-option-text">
        <span className="portal-sheet-option-title">{title}</span>
        {subtitle?.trim() ? (
          <span className="portal-sheet-option-sub">{subtitle}</span>
        ) : null}
      </span>
      <span className="portal-sheet-option-chevron" aria-hidden>
        ›
      </span>
    </button>
  );
}

export function PortalSheetBack({
  onClick,
  children = "Zurück",
}: {
  onClick: () => void;
  children?: ReactNode;
}) {
  return (
    <button type="button" className="portal-sheet-back" onClick={onClick}>
      ← {children}
    </button>
  );
}

export function PortalSheetLead({ children }: { children: ReactNode }) {
  return <p className="portal-sheet-lead">{children}</p>;
}

export function PortalSheetStack({ children }: { children: ReactNode }) {
  return <div className="portal-sheet-stack">{children}</div>;
}
