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
          "border border-[#DCE6FF] bg-[#F6F8FE] text-[#315AA8]",
        variant === "warn" &&
          "border border-[#F2CFCF] bg-[#FFF7F7] text-[#C0392B]",
        className
      )}
    >
      {children}
    </div>
  );
}
