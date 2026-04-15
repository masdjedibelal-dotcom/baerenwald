"use client";

import type { ReactNode } from "react";

import type { StepOption } from "@/lib/types";
import { cn } from "@/lib/utils";

export type SelectionTileOption = StepOption;

export interface SelectionTileProps {
  option: SelectionTileOption;
  /** Nur wenn `option.emoji` fehlt (z. B. Fachdetails) */
  icon?: ReactNode | null;
  selected: boolean;
  multi: boolean;
  onChange: (value: string, selected: boolean) => void;
  className?: string;
}

function expandCopy(opt: SelectionTileOption): {
  text: string | undefined;
  variant: "info" | "warn";
} {
  if (opt.warnText) return { text: opt.warnText, variant: "warn" };
  if (opt.infoExpand) return { text: opt.infoExpand, variant: "info" };
  const infoText = (opt as { infoText?: string }).infoText;
  if (infoText) return { text: infoText, variant: "info" };
  return { text: undefined, variant: "info" };
}

export function SelectionTile({
  option,
  icon,
  selected,
  multi,
  onChange,
  className,
}: SelectionTileProps) {
  const { text: expandText, variant } = expandCopy(option);
  const showExpand = selected && Boolean(expandText);
  const emoji = option.emoji;

  return (
    <button
      type="button"
      onClick={() => onChange(option.value, !selected)}
      className={cn(
        "funnel-tile relative text-left",
        selected && "selected",
        className
      )}
    >
      <div className="absolute right-3 top-3" aria-hidden>
        {multi ? (
          <span
            className={cn(
              "flex size-[18px] items-center justify-center rounded border border-border-default bg-surface-card",
              selected && "border-funnel-accent bg-funnel-accent text-white"
            )}
          >
            {selected ? (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path
                  d="M1 4L3.5 6.5L9 1"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            ) : null}
          </span>
        ) : (
          <span
            className={cn(
              "flex size-[18px] items-center justify-center rounded-full border border-border-default bg-surface-card",
              selected && "border-[1.5px] border-funnel-accent"
            )}
          >
            {selected ? (
              <span className="size-2.5 rounded-full bg-funnel-accent" />
            ) : null}
          </span>
        )}
      </div>

      <div className="pr-8">
        {emoji ? (
          <span className="funnel-tile-emoji" aria-hidden>
            {emoji}
          </span>
        ) : icon ? (
          <span className="funnel-tile-icon-wrap" aria-hidden>
            {icon}
          </span>
        ) : null}
        <p className="funnel-tile-label">{option.label}</p>
        {option.hint ? (
          <p className="funnel-tile-hint">{option.hint}</p>
        ) : null}
        {option.priceTag ? (
          <span className="mt-1.5 inline-block rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-800">
            {option.priceTag}
          </span>
        ) : null}
      </div>

      {showExpand && expandText ? (
        <div
          className={cn(
            "animate-in fade-in slide-in-from-top-1 mt-2 rounded-r-lg border-l-2 p-2 text-[11px] duration-200",
            variant === "info" &&
              "border-[#378ADD] bg-[#F6F8FE] text-[#315AA8]",
            variant === "warn" &&
              "border-[#F2CFCF] bg-[#FFF7F7] text-[#C0392B]"
          )}
        >
          {expandText}
        </div>
      ) : null}
    </button>
  );
}
