"use client";

import { Check, ChevronDown, Minus } from "lucide-react";
import { useState } from "react";

import type { VergleichColumn, VergleichRow } from "@/lib/products/plan-vergleich";

type Props = {
  baseline?: string;
  columns: VergleichColumn[];
  rows: VergleichRow[];
  selectedColumnId?: string;
  toggleLabel?: string;
};

function Cell({ value }: { value: string }) {
  if (value === "yes") {
    return (
      <span className="conversion-vergleich-icon conversion-vergleich-icon--yes" aria-hidden>
        <Check size={16} strokeWidth={2.5} />
      </span>
    );
  }
  if (value === "no" || value === "—") {
    return (
      <span className="conversion-vergleich-icon conversion-vergleich-icon--no" aria-hidden>
        <Minus size={16} strokeWidth={2} />
      </span>
    );
  }
  return <span className="conversion-vergleich-text">{value}</span>;
}

export function PlanVergleichAccordion({
  baseline,
  columns,
  rows,
  selectedColumnId,
  toggleLabel = "Alle Leistungen im Vergleich",
}: Props) {
  const [open, setOpen] = useState(false);

  if (columns.length === 0 || rows.length === 0) return null;

  const colCount = columns.length;

  return (
    <div className="conversion-vergleich-wrap">
      {baseline ? <p className="conversion-plan-baseline">{baseline}</p> : null}

      <button
        type="button"
        className="conversion-vergleich-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{open ? "Weniger anzeigen" : toggleLabel}</span>
        <ChevronDown
          size={18}
          className={`conversion-vergleich-toggle-icon${open ? " conversion-vergleich-toggle-icon--open" : ""}`}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          className="conversion-vergleich-body"
          style={{ "--vergleich-cols": colCount } as React.CSSProperties}
        >
          <div className="conversion-vergleich-col-headers" aria-hidden>
            {columns.map((col) => (
              <span
                key={col.id}
                className={`conversion-vergleich-col-header${selectedColumnId === col.id ? " conversion-vergleich-col-header--active" : ""}`}
              >
                {col.label}
              </span>
            ))}
          </div>

          {rows.map((row) => (
            <div key={row.id} className="conversion-vergleich-row">
              <p className="conversion-vergleich-row-label">{row.label}</p>
              <div className="conversion-vergleich-row-cells">
                {columns.map((col) => (
                  <div
                    key={col.id}
                    className={`conversion-vergleich-cell${selectedColumnId === col.id ? " conversion-vergleich-cell--active" : ""}`}
                  >
                    <span className="conversion-vergleich-cell-tier">{col.label}</span>
                    <Cell value={row.values[col.id] ?? "no"} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
