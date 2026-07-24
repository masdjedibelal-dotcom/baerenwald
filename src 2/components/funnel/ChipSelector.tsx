"use client";

import type { ChipOption } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface ChipSelectorProps {
  options: ChipOption[];
  selected: string | string[];
  multi: boolean;
  onChange: (values: string[]) => void;
  accentColor?: string;
  className?: string;
}

function isSelected(selected: string | string[], value: string): boolean {
  return Array.isArray(selected)
    ? selected.includes(value)
    : selected === value;
}

export function ChipSelector({
  options,
  selected,
  multi,
  onChange,
  accentColor = "#1B4332",
  className,
}: ChipSelectorProps) {
  const toggle = (value: string) => {
    if (multi) {
      const cur = Array.isArray(selected) ? selected : selected ? [selected] : [];
      if (cur.includes(value)) {
        onChange(cur.filter((v) => v !== value));
      } else {
        onChange([...cur, value]);
      }
      return;
    }
    onChange(isSelected(selected, value) ? [] : [value]);
  };

  return (
    <div className={cn("flex flex-wrap gap-[7px]", className)}>
      {options.map((opt) => {
        const active = isSelected(selected, opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={cn(
              "rounded-[999px] border border-border-default bg-surface-card px-[15px] py-[7px] text-[13px] transition-colors",
              active
                ? "border-transparent text-white"
                : "text-text-secondary hover:border-border-strong hover:text-text-primary"
            )}
            style={
              active
                ? { backgroundColor: accentColor, borderColor: accentColor }
                : undefined
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
