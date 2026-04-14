"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export interface StepWrapperProps {
  stepLabel?: string;
  question?: string;
  subtext?: string;
  children: ReactNode;
  className?: string;
  animateKey?: string | number;
}

export function StepWrapper({
  stepLabel,
  question,
  subtext,
  children,
  className,
  animateKey = 0,
}: StepWrapperProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(false);
    const id = requestAnimationFrame(() => setShow(true));
    return () => cancelAnimationFrame(id);
  }, [animateKey]);

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
        <p className="mb-6 mt-2 text-sm leading-relaxed text-text-secondary">
          {subtext}
        </p>
      ) : question ? (
        <div className="mb-6" />
      ) : null}
      {children}
    </div>
  );
}
