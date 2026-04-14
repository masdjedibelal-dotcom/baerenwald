"use client";

import { cn } from "@/lib/utils";

const ZEITRAUM_CHIPS: { value: string; label: string }[] = [
  { value: "sofort", label: "Sofort" },
  { value: "4wochen", label: "In 4 Wochen" },
  { value: "1-3monate", label: "In 1–3 Monaten" },
  { value: "offen", label: "Flexibel" },
];

export interface PlzStepProps {
  plz: string;
  zeitraum: string;
  onPlzChange: (plz: string) => void;
  onZeitraumChange: (value: string) => void;
  className?: string;
}

export function PlzStep({
  plz,
  zeitraum,
  onPlzChange,
  onZeitraumChange,
  className,
}: PlzStepProps) {
  return (
    <div className={cn("space-y-5", className)}>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="postal-code"
        maxLength={5}
        placeholder="PLZ"
        value={plz}
        onChange={(e) =>
          onPlzChange(e.target.value.replace(/\D/g, "").slice(0, 5))
        }
        className="w-full max-w-[180px] rounded-xl border border-border-default p-3 text-[15px] text-text-primary outline-none transition-colors focus:border-funnel-accent"
      />
      <div className="flex flex-wrap gap-2">
        {ZEITRAUM_CHIPS.map((c) => {
          const active = zeitraum === c.value;
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => onZeitraumChange(c.value)}
              className={cn(
                "rounded-full border border-border-default px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-funnel-accent bg-funnel-accent text-white"
                  : "bg-surface-card text-text-secondary hover:border-text-tertiary"
              )}
            >
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
