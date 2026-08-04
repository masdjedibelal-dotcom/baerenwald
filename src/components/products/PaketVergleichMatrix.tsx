"use client";

import { Check, ChevronDown, HelpCircle, Minus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { track } from "@/lib/analytics";

export type MatrixColumn = {
  id: string;
  label: string;
  price?: string;
  subtitle?: string;
  featured?: boolean;
};

export type MatrixRow = {
  id: string;
  label: string;
  tooltip?: string;
  primary?: boolean;
  values: Record<string, string>;
};

type Props = {
  title?: string;
  columns: MatrixColumn[];
  rows: MatrixRow[];
  selectedColumnId?: string;
  onSelectColumn?: (columnId: string) => void;
  familie?: string;
  quelle?: string;
};

function Cell({ value }: { value: string }) {
  if (value === "yes") {
    return (
      <span className="conversion-matrix-icon conversion-matrix-icon--yes" aria-label="Enthalten">
        <Check size={16} strokeWidth={2.5} />
      </span>
    );
  }
  if (value === "no" || value === "—") {
    return (
      <span className="conversion-matrix-icon conversion-matrix-icon--no" aria-hidden>
        <Minus size={16} strokeWidth={2} />
      </span>
    );
  }
  return <span className="conversion-matrix-text">{value}</span>;
}

function valuesDiffer(row: MatrixRow, columnIds: string[]): boolean {
  const vals = columnIds.map((id) => row.values[id] ?? "no");
  return new Set(vals).size > 1;
}

function splitRows(rows: MatrixRow[], columnIds: string[]) {
  const primary: MatrixRow[] = [];
  const secondary: MatrixRow[] = [];

  for (const row of rows) {
    if (row.primary) {
      primary.push(row);
    } else if (valuesDiffer(row, columnIds)) {
      primary.push(row);
    } else {
      secondary.push(row);
    }
  }

  return { primary, secondary };
}

function MatrixRowCells({
  row,
  columns,
  selectedColumnId,
}: {
  row: MatrixRow;
  columns: MatrixColumn[];
  selectedColumnId?: string;
}) {
  return (
    <tr>
      <th scope="row" className="conversion-matrix-feature-label">
        <span className="conversion-matrix-label-text">{row.label}</span>
        {row.tooltip ? (
          <span className="conversion-matrix-tooltip" title={row.tooltip}>
            <HelpCircle size={14} aria-label={row.tooltip} />
          </span>
        ) : null}
      </th>
      {columns.map((col) => (
        <td
          key={col.id}
          className={selectedColumnId === col.id ? "conversion-matrix-cell--active" : ""}
        >
          <Cell value={row.values[col.id] ?? "no"} />
        </td>
      ))}
    </tr>
  );
}

export function PaketVergleichMatrix({
  title = "Leistungsvergleich",
  columns,
  rows,
  selectedColumnId,
  onSelectColumn,
  familie = "bad",
  quelle = "landing",
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const viewedRef = useRef(false);

  const columnIds = useMemo(() => columns.map((c) => c.id), [columns]);
  const { primary, secondary } = useMemo(
    () => splitRows(rows, columnIds),
    [rows, columnIds]
  );

  const visibleRows = expanded ? [...primary, ...secondary] : primary;

  useEffect(() => {
    setExpanded(false);
  }, [columns, rows]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || viewedRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !viewedRef.current) {
          viewedRef.current = true;
          track.konverterMatrixView(familie, quelle);
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [familie, quelle]);

  function handleColumnSelect(columnId: string) {
    onSelectColumn?.(columnId);
    track.konverterMatrixTier(familie, columnId, quelle);
  }

  return (
    <div className="conversion-matrix-wrap" ref={wrapRef}>
      <h3 className="conversion-matrix-title">{title}</h3>
      <div className="conversion-matrix-scroll">
        <table className="conversion-matrix">
          <thead className="conversion-matrix-thead">
            <tr>
              <th scope="col" className="conversion-matrix-feature-col">
                <span className="conversion-matrix-head-label">Leistung</span>
              </th>
              {columns.map((col) => (
                <th
                  key={col.id}
                  scope="col"
                  className={`conversion-matrix-tier-col${selectedColumnId === col.id ? " conversion-matrix-tier-col--active" : ""}${col.featured ? " conversion-matrix-tier-col--featured" : ""}`}
                >
                  {col.featured ? (
                    <span className="conversion-matrix-head-badge">Empfohlen</span>
                  ) : null}
                  {onSelectColumn ? (
                    <button
                      type="button"
                      className="conversion-matrix-tier-btn"
                      onClick={() => handleColumnSelect(col.id)}
                    >
                      {col.label}
                    </button>
                  ) : (
                    <span className="conversion-matrix-head-name">{col.label}</span>
                  )}
                  {col.subtitle ? (
                    <span className="conversion-matrix-head-sub">{col.subtitle}</span>
                  ) : null}
                  {col.price ? (
                    <span className="conversion-matrix-head-price">{col.price}</span>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <MatrixRowCells
                key={row.id}
                row={row}
                columns={columns}
                selectedColumnId={selectedColumnId}
              />
            ))}
          </tbody>
        </table>

        {secondary.length > 0 ? (
          <button
            type="button"
            className="conversion-matrix-toggle"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            <span>
              {expanded
                ? "Weniger anzeigen"
                : `Alle Leistungen anzeigen (${secondary.length} weitere)`}
            </span>
            <ChevronDown
              size={18}
              className={`conversion-matrix-toggle-icon${expanded ? " conversion-matrix-toggle-icon--open" : ""}`}
              aria-hidden
            />
          </button>
        ) : null}
      </div>
    </div>
  );
}
