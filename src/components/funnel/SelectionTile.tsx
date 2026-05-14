"use client";

import type { ReactNode } from "react";

import { BwIcon } from "@/components/ui/BwIcon";
import type { StepOption } from "@/lib/types";
import { cn } from "@/lib/utils";

export type SelectionTileOption = StepOption;

export interface SelectionTileProps {
  option: SelectionTileOption;
  /** Nur wenn weder `option.icon` noch `option.emoji` (z. B. Fachdetails) */
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
  const optIconName = option.icon;
  const hasVisual = Boolean(optIconName || emoji || icon);

  return (
    <button
      type="button"
      onClick={() => onChange(option.value, !selected)}
      className={cn(
        "funnel-tile relative text-left",
        !hasVisual && "funnel-tile--text-only",
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

      <div
        className={cn(
          "pr-8",
          !hasVisual &&
            "flex min-h-[5.25rem] flex-col justify-center gap-0.5 py-4"
        )}
      >
        {optIconName ? (
          <span className="funnel-tile-icon-wrap" aria-hidden>
            <BwIcon name={optIconName} />
          </span>
        ) : emoji ? (
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
            "animate-in fade-in mt-2 rounded-lg border p-2 text-[11px] duration-200",
            variant === "info" &&
              "border-blue-200/80 bg-[#F6F8FE] text-[#315AA8]",
            variant === "warn" &&
              "border-red-200/80 bg-[#FFF7F7] text-[#C0392B]"
          )}
        >
          {expandText}
        </div>
      ) : null}
    </button>
  );
}
