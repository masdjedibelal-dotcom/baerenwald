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
  children: ReactNode;
  className?: string;
  animateKey?: string | number;
  /** Kacheln in einer hellen Karte mit Rand (Abgrenzung zur Frage) */
  tilesCard?: boolean;
}

export function StepWrapper({
  stepLabel,
  question,
  subtext,
  banner,
  children,
  className,
  animateKey = 0,
  tilesCard = false,
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

  return (
    <div
      className={cn(
        "mx-auto max-w-xl px-6 pb-32 pt-8",
        show && "animate-fade-in",
        className
      )}
    >
      {stepLabel ? (
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-text-tertiary">
          {stepLabel}
        </p>
      ) : null}
      {question ? (
        <h1 className="text-[22px] font-extrabold leading-tight tracking-tight text-text-primary">
          {question}
        </h1>
      ) : null}
      {subtext ? (
        <p className="mb-6 mt-2 whitespace-pre-line text-sm leading-relaxed text-text-secondary">
          {subtext}
        </p>
      ) : question ? (
        <div className="mb-6" />
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
