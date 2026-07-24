"use client";

import { Check, ChevronDown, Minus } from "lucide-react";
import { useState } from "react";

import type { VergleichColumn, VergleichRow } from "@/lib/products/plan-vergleich";

type Props = {
  columns: VergleichColumn[];
  rows: VergleichRow[];
  selectedColumnId?: string;
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

/** Immer sichtbar: Leistung links (mit Detail-Toggle), S/M/L als Häkchen-Spalten. */
export function PlanVergleichMatrix({
  columns,
  rows,
  selectedColumnId,
}: Props) {
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  if (columns.length === 0 || rows.length === 0) return null;

  const colCount = columns.length;

  return (
    <div className="conversion-vergleich-wrap conversion-vergleich-wrap--matrix">
      <div
        className="conversion-vergleich-body conversion-vergleich-body--open"
        style={{ "--vergleich-cols": colCount } as React.CSSProperties}
      >
        <div className="conversion-vergleich-col-headers" aria-hidden>
          <span className="conversion-vergleich-col-header conversion-vergleich-col-header--label">
            Leistung
          </span>
          {columns.map((col) => (
            <span
              key={col.id}
              className={`conversion-vergleich-col-header${selectedColumnId === col.id ? " conversion-vergleich-col-header--active" : ""}`}
            >
              {col.label}
            </span>
          ))}
        </div>

        {rows.map((row) => {
          const expanded = expandedRowId === row.id;
          const hasDetail = Boolean(row.detail?.trim());
          return (
            <div key={row.id} className="conversion-vergleich-row">
              <div className="conversion-vergleich-row-label-wrap">
                {hasDetail ? (
                  <button
                    type="button"
                    className="conversion-vergleich-row-toggle"
                    onClick={() =>
                      setExpandedRowId((id) => (id === row.id ? null : row.id))
                    }
                    aria-expanded={expanded}
                  >
                    <span>{row.label}</span>
                    <ChevronDown
                      size={16}
                      className={`conversion-vergleich-row-toggle-icon${expanded ? " conversion-vergleich-row-toggle-icon--open" : ""}`}
                      aria-hidden
                    />
                  </button>
                ) : (
                  <p className="conversion-vergleich-row-label">{row.label}</p>
                )}
                {hasDetail && expanded ? (
                  <p className="conversion-vergleich-row-detail">{row.detail}</p>
                ) : null}
              </div>
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
          );
        })}
      </div>
    </div>
  );
}
