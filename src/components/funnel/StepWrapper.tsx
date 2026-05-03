"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const FUNNEL_FIELD_SCROLL_DEBOUNCE_MS = 320;

function scrollFunnelStepContentDown() {
  if (typeof window === "undefined") return;
  const y = window.scrollY;
  const vh = window.innerHeight;
  const sh = Math.max(
    document.documentElement.scrollHeight,
    document.body.scrollHeight
  );
  const roomBelow = sh - y - vh - 12;
  if (roomBelow < 32) return;

  const delta = Math.min(
    260,
    Math.max(120, Math.round(vh * 0.22)),
    roomBelow
  );
  const reduced =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  window.scrollBy({
    top: delta,
    behavior: reduced ? ("instant" as ScrollBehavior) : "smooth",
  });
}

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
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRevealTimerRef = useRef<number | null>(null);

  const scheduleScrollRevealBelow = useCallback(() => {
    if (scrollRevealTimerRef.current != null) {
      window.clearTimeout(scrollRevealTimerRef.current);
    }
    scrollRevealTimerRef.current = window.setTimeout(() => {
      scrollRevealTimerRef.current = null;
      requestAnimationFrame(() => scrollFunnelStepContentDown());
    }, FUNNEL_FIELD_SCROLL_DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const interactiveSelector =
      "button, input, select, textarea, [contenteditable='true']";

    const isRelevantTarget = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return false;
      const el = target.closest(interactiveSelector);
      if (!el || !root.contains(el)) return false;
      if (el.closest(".funnel-footer, .funnel-header, [data-skip-funnel-scroll]")) {
        return false;
      }
      return true;
    };

    const onPointerUp = (e: Event) => {
      if (!isRelevantTarget(e.target)) return;
      scheduleScrollRevealBelow();
    };

    const onChange = (e: Event) => {
      if (!isRelevantTarget(e.target)) return;
      scheduleScrollRevealBelow();
    };

    const onFocusIn = (e: FocusEvent) => {
      if (!isRelevantTarget(e.target)) return;
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      if (
        t.matches(
          "input[type='text'], input[type='email'], input[type='tel'], input[type='number'], input[type='search'], input:not([type]), textarea"
        )
      ) {
        scheduleScrollRevealBelow();
      }
    };

    root.addEventListener("pointerup", onPointerUp, true);
    root.addEventListener("change", onChange, true);
    root.addEventListener("focusin", onFocusIn);

    return () => {
      root.removeEventListener("pointerup", onPointerUp, true);
      root.removeEventListener("change", onChange, true);
      root.removeEventListener("focusin", onFocusIn);
      if (scrollRevealTimerRef.current != null) {
        window.clearTimeout(scrollRevealTimerRef.current);
        scrollRevealTimerRef.current = null;
      }
    };
  }, [animateKey, scheduleScrollRevealBelow]);

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
      ref={rootRef}
      className={cn(
        "mx-auto max-w-xl px-6 pb-4 pt-8",
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
        <h1 className="funnel-step-question">{question}</h1>
      ) : null}
      {subtext ? (
        <p className="funnel-step-subtext">{subtext}</p>
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
