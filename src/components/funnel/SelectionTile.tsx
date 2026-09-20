"use client";

import type { ReactNode } from "react";

import { PortalIcon } from "@/components/portal/PortalIcon";
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
              "flex size-[18px] items-center justify-center rounded-card border border-border-default bg-surface-card",
              selected && "border-funnel-accent bg-funnel-accent text-white"
            )}
          >
            {selected ? (
              <PortalIcon n="check" ctx="default" size={10} />
            ) : null}
          </span>
        ) : (
          <span
            className={cn(
              "flex size-[18px] items-center justify-center rounded-pill border border-border-default bg-surface-card",
              selected && "border-[1.5px] border-funnel-accent"
            )}
          >
            {selected ? (
              <span className="size-2.5 rounded-pill bg-funnel-accent" />
            ) : null}
          </span>
        )}
      </div>

      <div className="pr-8">
        {optIconName ? (
          <span className="funnel-tile-icon-wrap" aria-hidden>
            <PortalIcon asset={optIconName} size={22} />
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
          <span className="mt-1.5 inline-block rounded-card bg-[var(--fl-accent-light)] px-1.5 py-0.5 text-fs-caption font-medium text-[var(--fl-accent)]">
            {option.priceTag}
          </span>
        ) : null}
      </div>

      {showExpand && expandText ? (
        <div
          className={cn(
            "animate-in fade-in mt-2 rounded-card border p-2 text-fs-caption duration-200",
            variant === "info" &&
              "border-border-default/80 bg-[var(--fl-status-blue-bg)] text-[var(--fl-status-blue)]",
            variant === "warn" &&
              "border-[var(--fl-danger-line)]/80 bg-[var(--fl-danger-tint)] text-[var(--fl-danger)]"
          )}
        >
          {expandText}
        </div>
      ) : null}
    </button>
  );
}
