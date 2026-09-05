"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";

import type { GroesseSliderConfig } from "@/lib/funnel/config";
import { SelectionTile } from "@/components/funnel/SelectionTile";
import type { StepOption } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Innerhalb des konfigurierten Bereichs: auf Step snappen und auf min/max begrenzen. */
function clampToStep(n: number, config: GroesseSliderConfig): number {
  const stepped = Math.round(n / config.step) * config.step;
  return Math.min(config.max, Math.max(config.min, stepped));
}

/** Manuelle Eingabe: innerhalb [min,max] wie der Slider; außerhalb Wert behalten (nur sinnvolle Rundung). */
function normalizeManualEntry(n: number, config: GroesseSliderConfig): number {
  if (!Number.isFinite(n) || n <= 0) {
    return config.default;
  }
  if (n >= config.min && n <= config.max) {
    return clampToStep(n, config);
  }
  if (config.step >= 1) {
    return Math.max(0.1, Math.round(n));
  }
  return Math.round(n / config.step) * config.step;
}

function chipToOption(chip: {
  label: string;
  value: number;
  hint?: string;
}): StepOption {
  return {
    value: String(chip.value),
    label: chip.label,
    hint: chip.hint,
  };
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
  const [draft, setDraft] = useState(() =>
    groesse != null ? String(groesse) : ""
  );

  useEffect(() => {
    setDraft(groesse != null ? String(groesse) : "");
  }, [groesse]);

  useLayoutEffect(() => {
    if (groesse === null) {
      onGroesseChange(config.default);
    }
  }, [groesse, config.default, onGroesseChange]);

  const numericGroesse = groesse ?? config.default;

  /** Slider-Ende nach rechts ausdehnen, wenn ein größerer Wert eingegeben wurde. */
  const rangeMaxUi = useMemo(
    () => Math.max(config.max, numericGroesse),
    [config.max, numericGroesse]
  );

  const thumbValue = useMemo(() => {
    if (numericGroesse < config.min) return config.min;
    return Math.min(numericGroesse, rangeMaxUi);
  }, [numericGroesse, config.min, rangeMaxUi]);

  const commitManual = useCallback(
    (rawStr: string) => {
      const trimmed = rawStr.trim();
      if (trimmed === "") {
        onGroesseChange(config.default);
        setDraft(String(config.default));
        return;
      }
      const n = Number(trimmed.replace(",", "."));
      if (!Number.isFinite(n) || n <= 0) {
        setDraft(groesse != null ? String(groesse) : String(config.default));
        return;
      }
      const v = normalizeManualEntry(n, config);
      onGroesseChange(v);
      setDraft(String(v));
    },
    [config, groesse, onGroesseChange]
  );

  const onSliderChange = useCallback(
    (raw: number) => {
      const stepped = Math.round(raw / config.step) * config.step;
      const hi = rangeMaxUi;
      const v = Math.min(hi, Math.max(config.min, stepped));
      onGroesseChange(v);
      setDraft(String(v));
    },
    [config.min, config.step, onGroesseChange, rangeMaxUi]
  );

  const hideSlider = Boolean(config.hideSlider);

  const showUnderMinHint =
    groesse != null && groesse < config.min && groesse > 0;

  return (
    <div className={cn("groesse-step", className)}>
      <div className="groesse-einheit-label">{config.einheit}</div>

      <div className="groesse-display groesse-display--editable">
        <input
          type="number"
          inputMode="decimal"
          className="groesse-zahl-input funnel-input"
          value={draft}
          min={0}
          aria-label={`${config.einheit}, Zahl`}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commitManual(draft)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitManual(draft);
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
        <span className="groesse-unit">{config.einheitKurz}</span>
      </div>

      {!hideSlider ? (
        <>
          <div className="groesse-slider-wrap">
            <input
              type="range"
              min={config.min}
              max={rangeMaxUi}
              step={config.step}
              value={thumbValue}
              onChange={(e) => onSliderChange(Number(e.target.value))}
              className="groesse-slider"
              aria-valuemin={config.min}
              aria-valuemax={rangeMaxUi}
              aria-valuenow={thumbValue}
            />
            <div className="groesse-slider-labels">
              <span>
                {config.min} {config.einheitKurz}
              </span>
              <span>
                {rangeMaxUi > config.max
                  ? `${rangeMaxUi} ${config.einheitKurz}`
                  : `${config.max}+ ${config.einheitKurz}`}
              </span>
            </div>
          </div>

          {showUnderMinHint ? (
            <p className="groesse-range-hint" role="status">
              {config.einheitKurz === "m²" ? (
                <>
                  Hinweis: Für Kleinstmengen unter 3 m² berechnen viele Betriebe
                  Pauschalen.
                </>
              ) : (
                <>
                  Hinweis: Dein Wert liegt unter der üblichen Auswahl — die
                  Schätzung kann ungenauer werden.
                </>
              )}
            </p>
          ) : null}
        </>
      ) : null}

      <div className="space-y-3">
        {config.chips.map((chip) => {
          const opt = chipToOption(chip);
          const selected = groesse === chip.value;
          return (
            <SelectionTile
              key={`${chip.label}-${chip.value}`}
              option={opt}
              icon={null}
              selected={selected}
              multi={false}
              onChange={(value, sel) => {
                if (sel) {
                  const v = clampToStep(Number(value), config);
                  onGroesseChange(v);
                  setDraft(String(v));
                  return;
                }
                onGroesseChange(config.default);
                setDraft(String(config.default));
              }}
            />
          );
        })}
      </div>

      {hideSlider && showUnderMinHint ? (
        <p className="groesse-range-hint" role="status">
          {config.einheitKurz === "m²" ? (
            <>
              Hinweis: Für Kleinstmengen unter 3 m² berechnen viele Betriebe
              Pauschalen.
            </>
          ) : (
            <>
              Hinweis: Dein Wert liegt unter der üblichen Auswahl — die Schätzung
              kann ungenauer werden.
            </>
          )}
        </p>
      ) : null}

      <p className="groesse-hint">
        Ungefähre Angabe reicht — beim Vor-Ort-Termin messen wir genau.
      </p>
    </div>
  );
}
