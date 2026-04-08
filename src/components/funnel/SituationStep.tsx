"use client";

import { SITUATION_OPTIONS } from "@/lib/situation-options";
import type { Situation } from "@/lib/types";
import { cn } from "@/lib/utils";

import { SituationCard } from "./SituationCard";

export { SITUATION_OPTIONS };

export interface SituationStepProps {
  value: Situation | null;
  onSelect: (s: Situation) => void;
  accentColor?: string;
  className?: string;
}

export function SituationStep({
  value,
  onSelect,
  accentColor = "#1B4332",
  className,
}: SituationStepProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", className)}>
      {SITUATION_OPTIONS.map((opt) => (
        <SituationCard
          key={opt.id}
          situation={opt.id}
          label={opt.label}
          hint={opt.hint}
          tag={opt.tag}
          tagType={opt.tagType}
          selected={value === opt.id}
          onClick={() => onSelect(opt.id)}
          accentColor={accentColor}
          wide={opt.id === "b2b"}
        />
      ))}
    </div>
  );
}
