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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(false);
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, [animateKey]);

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[540px] px-[18px]",
        mounted && "fade-in",
        className
      )}
    >
      {stepLabel ? (
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.07em] text-[#999]">
          {stepLabel}
        </p>
      ) : null}
      {question ? (
        <h1 className="mb-2 text-xl font-semibold leading-[1.25] tracking-[-0.01em] text-text-primary">
          {question}
        </h1>
      ) : null}
      {subtext ? (
        <p className="mb-6 text-[13px] leading-normal text-[#666]">{subtext}</p>
      ) : question ? (
        <div className="mb-6" />
      ) : null}
      {children}
    </div>
  );
}
