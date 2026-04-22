import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type SectionBg = "white" | "muted" | "dark";

const bgClass: Record<SectionBg, string> = {
  white: "bg-surface-card",
  muted: "bg-surface-page",
  dark: "bg-surface-dark text-white",
};

export interface SectionWrapperProps {
  children: ReactNode;
  bg?: SectionBg;
  maxWidth?: string;
  className?: string;
  id?: string;
}

export function SectionWrapper({
  children,
  bg = "white",
  maxWidth = "max-w-[1200px]",
  className,
  id,
}: SectionWrapperProps) {
  return (
    <section id={id} className={cn(bgClass[bg], "py-20", className)}>
      <div className={cn("mx-auto w-full px-6", maxWidth)}>{children}</div>
    </section>
  );
}
