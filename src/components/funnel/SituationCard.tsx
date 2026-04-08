"use client";

import type { Situation } from "@/lib/types";
import type { SituationTagType } from "@/lib/situation-options";
import { SituationIconPath } from "@/lib/situation-icons";
import { cn } from "@/lib/utils";

const TAG_STYLES: Record<
  SituationTagType,
  { bg: string; color: string }
> = {
  multi: { bg: "#E6F1FB", color: "#0C447C" },
  abo: { bg: "#EAF3DE", color: "#27500A" },
  urgent: { bg: "#FDECEA", color: "#9C2B2B" },
};

export interface SituationCardProps {
  situation: Situation;
  label: string;
  hint: string;
  tag: string;
  tagType: SituationTagType;
  selected: boolean;
  onClick: () => void;
  wide?: boolean;
  accentColor?: string;
  className?: string;
}

export function SituationCard({
  situation,
  label,
  hint,
  tag,
  tagType,
  selected,
  onClick,
  wide = false,
  accentColor = "#1B4332",
  className,
}: SituationCardProps) {
  const ts = TAG_STYLES[tagType];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative w-full cursor-pointer overflow-hidden rounded-[18px] border border-[#e8e8e8] px-[14px] pb-[13px] pt-4 text-left transition-colors hover:border-[#bbb]",
        wide && "sm:col-span-2 sm:flex sm:flex-row sm:items-center sm:gap-3",
        className
      )}
      style={
        selected
          ? {
              borderWidth: 1.5,
              borderColor: accentColor,
              backgroundColor: "#fafafa",
            }
          : undefined
      }
    >
      <div
        className="pointer-events-none absolute -bottom-1.5 -right-1.5 opacity-[0.05]"
        aria-hidden
      >
        <div className="size-[70px] text-text-primary">
          <SituationIconPath situation={situation} />
        </div>
      </div>

      <div
        className={cn(
          "relative z-[1] mb-[9px] flex size-[38px] shrink-0 items-center justify-center rounded-[9px] border border-[#e8e8e8] bg-[#f5f5f5]",
          !selected && "text-text-primary",
          wide && "mb-0"
        )}
        style={
          selected
            ? {
                backgroundColor: accentColor,
                borderColor: accentColor,
                color: "#fff",
              }
            : undefined
        }
      >
        <div className="size-[22px]">
          <SituationIconPath situation={situation} />
        </div>
      </div>

      <div className={cn("relative z-[1] min-w-0 flex-1", wide && "flex flex-wrap items-center gap-x-3 gap-y-1")}>
        <div>
          <p className="mb-0.5 text-[13px] font-semibold text-text-primary">{label}</p>
          <p className="text-[11px] leading-snug text-[#666]">{hint}</p>
        </div>
        <span
          className="mt-[7px] inline-block rounded-lg px-2 py-0.5 text-[10px] font-medium sm:mt-0"
          style={{ backgroundColor: ts.bg, color: ts.color }}
        >
          {tag}
        </span>
      </div>
    </button>
  );
}
