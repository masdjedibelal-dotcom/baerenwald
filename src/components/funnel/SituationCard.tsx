"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type SituationCardTagType = "multi" | "abo" | "notfall";

export interface SituationCardOption {
  value: string;
  label: string;
  hint: string;
  tag?: string;
  tagType?: SituationCardTagType;
}

export interface SituationCardProps {
  option: SituationCardOption;
  icon: ReactNode;
  watermarkIcon?: ReactNode;
  selected: boolean;
  onClick: () => void;
  className?: string;
}

const TAG_CLASS: Record<SituationCardTagType, string> = {
  multi: "bg-blue-50 text-blue-800",
  abo: "bg-green-50 text-green-800",
  notfall: "bg-amber-50 text-amber-900",
};

export function SituationCard({
  option,
  icon,
  watermarkIcon,
  selected,
  onClick,
  className,
}: SituationCardProps) {
  const wm = watermarkIcon ?? icon;
  const tagType = option.tagType;
  const tagClass = tagType ? TAG_CLASS[tagType] : "bg-muted text-text-secondary";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative w-full overflow-hidden rounded-[18px] border border-border-default p-4 text-left transition-colors",
        selected ? "funnel-tile-selected" : "funnel-tile-hover",
        className
      )}
    >
      <div
        className="pointer-events-none absolute bottom-0 right-0 size-16 opacity-5"
        aria-hidden
      >
        {wm}
      </div>

      <div
        className={cn(
          "relative z-[1] mb-2 flex size-[38px] items-center justify-center rounded-full bg-muted text-text-primary",
          selected && "bg-funnel-accent text-white"
        )}
      >
        <span className="flex size-[18px] items-center justify-center [&_svg]:size-[18px] [&_svg]:stroke-current">
          {icon}
        </span>
      </div>

      <div className="relative z-[1]">
        <p className="text-[13px] font-semibold text-text-primary">{option.label}</p>
        <p className="mt-0.5 text-[11px] text-text-secondary">{option.hint}</p>
        {option.tag ? (
          <span
            className={cn(
              "mt-1.5 inline-block rounded-lg px-2 py-0.5 text-[10px] font-medium",
              tagClass
            )}
          >
            {option.tag}
          </span>
        ) : null}
      </div>
    </button>
  );
}
