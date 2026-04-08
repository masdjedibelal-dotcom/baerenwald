"use client";

import type { ExtraQuestionDef } from "@/lib/extra-questions";
import type { StepAnswerValue } from "@/lib/types";

import { ChipSelector } from "./ChipSelector";
import { InfoBox } from "./InfoBox";

export interface ExtraQuestionProps {
  def: ExtraQuestionDef;
  value: StepAnswerValue | undefined;
  onChange: (value: string) => void;
  accentColor?: string;
  className?: string;
}

export function ExtraQuestion({
  def,
  value,
  onChange,
  accentColor = "#1B4332",
  className,
}: ExtraQuestionProps) {
  const sel = typeof value === "string" ? value : "";
  const effect = def.effects?.find((e) => e.whenValue === sel);

  return (
    <div className={className}>
      <ChipSelector
        options={def.options}
        selected={sel}
        multi={false}
        accentColor={accentColor}
        onChange={(vals) => onChange(vals[0] ?? "")}
      />
      {effect ? (
        <InfoBox variant={effect.variant} className="mt-3">
          {effect.text}
        </InfoBox>
      ) : null}
    </div>
  );
}
