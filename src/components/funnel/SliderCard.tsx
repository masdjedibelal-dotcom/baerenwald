"use client";

import { formatCurrencyEUR } from "@/lib/price-calc";
import type { FunnelStep } from "@/lib/types";
import { cn } from "@/lib/utils";

export type SliderFieldConfig = NonNullable<FunnelStep["sliderConfig"]>;

export interface SliderCardProps {
  config: SliderFieldConfig;
  label?: string;
  value: number;
  onChange: (value: number) => void;
  infoText?: string;
  livePrice?: { min: number; max: number } | null;
  accentColor?: string;
  className?: string;
}

export function SliderCard({
  config,
  label = "Fläche",
  value,
  onChange,
  infoText,
  livePrice,
  accentColor = "#1B4332",
  className,
}: SliderCardProps) {
  const { min, max, step, unit } = config;

  return (
    <div className={cn("fade-in w-full", className)}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <span className="text-[14px] text-[#666]">{label}</span>
        <span className="tabular-nums tracking-[-0.02em]">
          <span
            className="text-[26px] font-bold"
            style={{ color: accentColor }}
          >
            {value}
          </span>
          <span className="ml-1 text-[14px] text-[#999]">{unit}</span>
        </span>
      </div>
      <div
        className="w-full"
        style={{ "--acc": accentColor } as React.CSSProperties}
      >
        <input
          type="range"
          className="funnel-range w-full"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-[#999]">
        <span>
          {min} {unit}
        </span>
        <span>
          {max} {unit}
        </span>
      </div>
      {infoText ? (
        <p className="mt-4 text-[13px] leading-normal text-[#666]">{infoText}</p>
      ) : null}
      {livePrice ? (
        <div
          className="mt-4 rounded-[var(--r)] px-[14px] py-[11px]"
          style={{ backgroundColor: accentColor }}
        >
          <p className="text-[11px] text-white/70">Vorläufiger Preisrahmen</p>
          <p className="mt-0.5 text-[17px] font-semibold tracking-[-0.01em] text-white">
            {formatCurrencyEUR(livePrice.min).replace(/\s/g, " ")} –{" "}
            {formatCurrencyEUR(livePrice.max).replace(/\s/g, " ")}
          </p>
        </div>
      ) : null}
    </div>
  );
}
