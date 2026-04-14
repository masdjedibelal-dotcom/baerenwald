"use client";

import { cn } from "@/lib/utils";

export interface GroesseOption {
  value: string;
  label: string;
  hint?: string;
}

export interface GroesseSelectorProps {
  options: GroesseOption[];
  selected: string;
  onChange: (value: string) => void;
  className?: string;
}

export function GroesseSelector({
  options,
  selected,
  onChange,
  className,
}: GroesseSelectorProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      {options.map((opt) => {
        const isSel = selected === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-xl border border-border-default p-3 text-left transition-colors hover:border-text-tertiary",
              isSel &&
                "border-[1.5px] border-funnel-accent bg-funnel-accent/[0.04]"
            )}
          >
            <p className="text-[13px] font-medium text-text-primary">{opt.label}</p>
            {opt.hint ? (
              <p className="mt-1 text-[11px] text-text-secondary">{opt.hint}</p>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
