"use client";

import { PAKET_GROESSE_LABELS } from "@/lib/leistungen/converter-copy";
import type { ProduktGroesse } from "@/lib/products/types";

type Props = {
  groessen: ProduktGroesse[];
  value: ProduktGroesse;
  onChange: (g: ProduktGroesse) => void;
  label: string;
  name?: string;
};

export function ConversionGroesseToggle({
  groessen,
  value,
  onChange,
  label,
  name = "conversion-groesse",
}: Props) {
  return (
    <div className="conversion-groesse-toggle-wrap">
      <p className="conversion-groesse-toggle-label">{label}</p>
      <div className="conversion-groesse-toggle" role="radiogroup" aria-label={label}>
        {groessen.map((g) => {
          const meta = PAKET_GROESSE_LABELS[g];
          const active = value === g;
          return (
            <button
              key={g}
              type="button"
              role="radio"
              aria-checked={active}
              name={name}
              className={`conversion-groesse-toggle-btn${active ? " conversion-groesse-toggle-btn--active" : ""}`}
              onClick={() => onChange(g)}
            >
              <span className="conversion-groesse-toggle-letter">{meta.label}</span>
              <span className="conversion-groesse-toggle-hint">{meta.hint}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
