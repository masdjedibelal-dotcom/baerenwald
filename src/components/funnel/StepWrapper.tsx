"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export interface StepWrapperProps {
  stepLabel?: string;
  question?: string;
  subtext?: string;
  /** Kurzes positives Feedback (z. B. nach vorherigem Schritt) */
  banner?: ReactNode;
  /** Rechts neben Frage / Step-Label (z. B. + neues Objekt) */
  headerAction?: ReactNode;
  children: ReactNode;
  className?: string;
  animateKey?: string | number;
  /** Kacheln in einer hellen Karte mit Rand (Abgrenzung zur Frage) */
  tilesCard?: boolean;
  /**
   * `page` = Rechner (max-w-xl, großzügiges Padding).
   * `modal` = Portal-/Create-Modal (volle Breite, kompakter).
   */
  layout?: "page" | "modal";
}

export function StepWrapper({
  stepLabel,
  question,
  subtext,
  banner,
  headerAction,
  children,
  className,
  animateKey = 0,
  tilesCard = false,
  layout = "page",
}: StepWrapperProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(false);
    const id = requestAnimationFrame(() => setShow(true));
    return () => cancelAnimationFrame(id);
  }, [animateKey]);

  const body = tilesCard ? (
    <div className="funnel-step-tiles-card">{children}</div>
  ) : (
    children
  );

  const isModal = layout === "modal";

  return (
    <div
      className={cn(
        isModal
          ? "funnel-step-embed w-full"
          : "mx-auto max-w-xl px-6 pb-6 pt-8",
        show && "animate-fade-in",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {stepLabel ? (
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-text-tertiary">
              {stepLabel}
            </p>
          ) : null}
          {question ? (
            <h1 className="funnel-step-question">{question}</h1>
          ) : null}
        </div>
        {headerAction ? (
          <div className="shrink-0 pt-0.5">{headerAction}</div>
        ) : null}
      </div>
      {subtext ? (
        <p className="funnel-step-subtext">{subtext}</p>
      ) : question ? (
        <div className={isModal ? "mb-4" : "mb-6"} />
      ) : null}
      {banner ? (
        <div
          className="funnel-micro-banner mb-5 rounded-xl border border-border-default bg-surface-muted/80 px-3.5 py-2.5 text-[13px] leading-snug text-text-secondary"
          role="status"
        >
          {banner}
        </div>
      ) : null}
      {body}
    </div>
  );
}
