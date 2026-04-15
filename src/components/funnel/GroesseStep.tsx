"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";

import type { GroesseSliderConfig } from "@/lib/funnel/config";
import { cn } from "@/lib/utils";

function clampToStep(n: number, config: GroesseSliderConfig): number {
  const stepped = Math.round(n / config.step) * config.step;
  return Math.min(config.max, Math.max(config.min, stepped));
}

export interface GroesseStepProps {
  config: GroesseSliderConfig;
  groesse: number | null;
  onGroesseChange: (value: number) => void;
  className?: string;
}

export function GroesseStep({
  config,
  groesse,
  onGroesseChange,
  className,
}: GroesseStepProps) {
  const [inputValue, setInputValue] = useState(() =>
    groesse != null ? String(groesse) : ""
  );

  useEffect(() => {
    setInputValue(groesse != null ? String(groesse) : "");
  }, [groesse]);

  useLayoutEffect(() => {
    if (groesse === null) {
      onGroesseChange(config.default);
      return;
    }
    const clamped = clampToStep(groesse, config);
    if (clamped !== groesse) {
      onGroesseChange(clamped);
    }
  }, [groesse, config, onGroesseChange]);

  const applyValue = useCallback(
    (raw: number) => {
      const v = clampToStep(raw, config);
      onGroesseChange(v);
      setInputValue(String(v));
    },
    [config, onGroesseChange]
  );

  const sliderValue = groesse ?? config.default;
  const displayZahl = groesse ?? "–";

  return (
    <div className={cn("groesse-step", className)}>
      <div className="groesse-einheit-label">{config.einheit}</div>

      <div className="groesse-display">
        <span className="groesse-zahl">{displayZahl}</span>
        <span className="groesse-unit">{config.einheitKurz}</span>
      </div>

      <div className="groesse-slider-wrap">
        <input
          type="range"
          min={config.min}
          max={config.max}
          step={config.step}
          value={sliderValue}
          onChange={(e) => {
            applyValue(Number(e.target.value));
          }}
          className="groesse-slider"
          aria-valuemin={config.min}
          aria-valuemax={config.max}
          aria-valuenow={sliderValue}
        />
        <div className="groesse-slider-labels">
          <span>
            {config.min} {config.einheitKurz}
          </span>
          <span>
            {config.max}+ {config.einheitKurz}
          </span>
        </div>
      </div>

      <div className="groesse-chips">
        {config.chips.map((chip) => (
          <button
            key={chip.label}
            type="button"
            className={cn(
              "groesse-chip",
              groesse === chip.value ? "active" : ""
            )}
            onClick={() => {
              applyValue(chip.value);
            }}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="groesse-input-wrap">
        <span className="groesse-input-label">Genaue Angabe:</span>
        <input
          type="number"
          className="groesse-input funnel-input"
          value={inputValue}
          placeholder="z.B. 65"
          onChange={(e) => {
            const raw = e.target.value;
            setInputValue(raw);
            const num = Number(raw);
            if (raw === "" || Number.isNaN(num)) return;
            if (num > 0) applyValue(num);
          }}
          aria-label="Genaue Größe"
        />
        <span className="groesse-input-unit">{config.einheitKurz}</span>
      </div>

      <p className="groesse-hint">
        Ungefähre Angabe reicht — beim Vor-Ort-Termin messen wir genau.
      </p>
    </div>
  );
}
