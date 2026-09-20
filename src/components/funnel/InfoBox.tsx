"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface InfoBoxProps {
  variant: "info" | "warn";
  children: ReactNode;
  className?: string;
}

export function InfoBox({ variant, children, className }: InfoBoxProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--r)] px-[13px] py-2.5 text-xs leading-[1.55]",
        variant === "info" &&
          "border border-[var(--fl-status-blue-bg)] bg-[var(--fl-status-blue-bg)] text-[var(--fl-status-blue)]",
        variant === "warn" &&
          "border border-[var(--fl-danger-line)] bg-[var(--fl-danger-tint)] text-[var(--fl-danger)]",
        className
      )}
    >
      {children}
    </div>
  );
}
