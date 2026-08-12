"use client";

import type { HausservicePreisInput } from "@/lib/products/hausservice-preis";

type Props = {
  value: HausservicePreisInput;
  onChange: (next: HausservicePreisInput) => void;
};

export function ConversionServiceInputs({ value, onChange }: Props) {
  return (
    <div className="conversion-service-inputs">
      <p className="conversion-groesse-toggle-label">Dein Objekt</p>
      <div className="conversion-service-inputs-grid">
        <label className="conversion-service-input">
          <span className="conversion-service-input-label">Wohnfläche</span>
          <span className="conversion-service-input-field">
            <input
              type="number"
              inputMode="numeric"
              min={40}
              max={500}
              step={10}
              value={value.wohnflaeche}
              onChange={(e) =>
                onChange({
                  ...value,
                  wohnflaeche: Number(e.target.value) || 0,
                })
              }
            />
            <span className="conversion-service-input-unit">m²</span>
          </span>
        </label>
        <label className="conversion-service-input">
          <span className="conversion-service-input-label">Gartenfläche</span>
          <span className="conversion-service-input-field">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={2000}
              step={10}
              value={value.gartenQm}
              onChange={(e) =>
                onChange({
                  ...value,
                  gartenQm: Number(e.target.value) || 0,
                })
              }
            />
            <span className="conversion-service-input-unit">m²</span>
          </span>
        </label>
      </div>
    </div>
  );
}
