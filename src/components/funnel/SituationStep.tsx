"use client";

import { SITUATION_OPTIONS } from "@/lib/situation-options";
import { SituationIconPath } from "@/lib/situation-icons";
import type { Situation } from "@/lib/types";
import { cn } from "@/lib/utils";

import { SituationCard } from "./SituationCard";

export { SITUATION_OPTIONS };

export interface SituationStepProps {
  value: Situation | null;
  onSelect: (s: Situation) => void;
  className?: string;
}

export function SituationStep({ value, onSelect, className }: SituationStepProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", className)}>
      {SITUATION_OPTIONS.map((opt) => {
        const icon = <SituationIconPath situation={opt.id} />;
        return (
          <SituationCard
            key={opt.id}
            option={{
              value: opt.id,
              label: opt.label,
              hint: opt.hint,
              tag: opt.tag,
              tagType: opt.tagType,
            }}
            icon={icon}
            watermarkIcon={icon}
            selected={value === opt.id}
            onClick={() => onSelect(opt.id)}
            className={opt.id === "b2b" ? "sm:col-span-2" : undefined}
          />
        );
      })}
    </div>
  );
}
