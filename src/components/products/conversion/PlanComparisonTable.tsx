"use client";

import { Check, Info, Minus } from "lucide-react";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";

import { PlanLeistungenHinweis } from "@/components/products/conversion/PlanLeistungenHinweis";
import type {
  ComparisonColumn,
  ComparisonFeatureRow,
  ComparisonFeatureValue,
  ComparisonInputRow,
  ComparisonRow,
} from "@/lib/products/plan-comparison-table-types";

type Props = {
  columns: ComparisonColumn[];
  rows: ComparisonRow[];
  selectedColumnId: string;
  onSelectColumn: (columnId: string) => void;
  onCta: (columnId: string) => void;
  asideHeading?: string;
  priceHint?: string;
};

function FeatureInfoButton({
  label,
  rowId,
  open,
  onToggle,
}: {
  label: string;
  rowId: string;
  open: boolean;
  onToggle: (rowId: string) => void;
}) {
  return (
    <button
      type="button"
      className="plan-comparison-info-btn"
      onClick={() => onToggle(rowId)}
      aria-expanded={open}
      aria-controls={`plan-feature-info-${rowId}`}
      aria-label={`Mehr zu ${label}`}
    >
      <Info size={14} strokeWidth={2.25} aria-hidden />
    </button>
  );
}

function FeatureRowLabel({
  label,
  detail,
  rowId,
  open,
  onToggle,
  showInfoPanel = false,
}: {
  label: string;
  detail?: string;
  rowId: string;
  open: boolean;
  onToggle: (rowId: string) => void;
  showInfoPanel?: boolean;
}) {
  const hasDetail = Boolean(detail?.trim());

  return (
    <div className="plan-comparison-feature-label-wrap" data-feature-info-root={rowId}>
      <div className="plan-comparison-feature-label-row">
        <span className="plan-comparison-row-title">{label}</span>
        {hasDetail ? (
          <FeatureInfoButton label={label} rowId={rowId} open={open} onToggle={onToggle} />
        ) : null}
      </div>
      {showInfoPanel && open && hasDetail ? (
        <p
          id={`plan-feature-info-${rowId}`}
          className="plan-comparison-feature-info"
          data-feature-info-panel=""
          role="note"
        >
          {detail}
        </p>
      ) : null}
    </div>
  );
}

function FeatureCell({ value }: { value: ComparisonFeatureValue }) {
  if (value === "yes") {
    return (
      <span className="plan-comparison-icon plan-comparison-icon--yes" aria-hidden>
        <Check size={18} strokeWidth={2.5} />
      </span>
    );
  }
  if (value === "no") {
    return (
      <span className="plan-comparison-icon plan-comparison-icon--no" aria-hidden>
        <Minus size={18} strokeWidth={2} />
      </span>
    );
  }
  return <span className="plan-comparison-feature-text">{value}</span>;
}

function BandSelect({
  row,
  id,
}: {
  row: ComparisonInputRow;
  id?: string;
}) {
  return (
    <select
      id={id}
      className="plan-comparison-band-select"
      value={row.value}
      onChange={(e) => row.onChange(Number(e.target.value))}
      aria-label={row.label}
    >
      {row.bands.map((band) => (
        <option key={band.id} value={band.value}>
          {band.label}
        </option>
      ))}
    </select>
  );
}

function packageClass(col: ComparisonColumn, selectedColumnId: string): string {
  const parts = ["plan-comparison-package"];
  if (col.id === selectedColumnId) parts.push("plan-comparison-package--selected");
  return parts.join(" ");
}

function pkgCellClass(
  col: ComparisonColumn,
  selectedColumnId: string,
  part: "head" | "body" | "foot"
): string {
  return `plan-comparison-pkg-cell plan-comparison-pkg-cell--${part} ${packageClass(col, selectedColumnId)}`;
}

export function PlanComparisonTable({
  columns,
  rows,
  selectedColumnId,
  onSelectColumn,
  onCta,
  asideHeading = "Dein Objekt & Leistungen",
  priceHint,
}: Props) {
  const [infoRowId, setInfoRowId] = useState<string | null>(null);
  const [mobileIndex, setMobileIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const inputRows = rows.filter((r): r is ComparisonInputRow => r.kind === "input-band");
  const featureRows = rows.filter((r): r is ComparisonFeatureRow => r.kind === "feature");
  const colCount = columns.length;
  const openInfoRow = infoRowId
    ? featureRows.find((row) => row.id === infoRowId)
    : undefined;

  const syncMobileIndexFromSelection = useCallback(() => {
    const idx = columns.findIndex((c) => c.id === selectedColumnId);
    if (idx >= 0) setMobileIndex(idx);
  }, [columns, selectedColumnId]);

  useEffect(() => {
    syncMobileIndexFromSelection();
  }, [syncMobileIndexFromSelection]);

  useEffect(() => {
    const root = carouselRef.current;
    if (!root) return;
    const slide = root.children[mobileIndex] as HTMLElement | undefined;
    slide?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [mobileIndex]);

  const toggleFeatureInfo = useCallback((rowId: string) => {
    setInfoRowId((current) => (current === rowId ? null : rowId));
  }, []);

  const closeFeatureInfo = useCallback(() => {
    setInfoRowId(null);
  }, []);

  useEffect(() => {
    if (!infoRowId) return;

    function onPointerDown(e: MouseEvent | TouchEvent) {
      const target = e.target as HTMLElement;
      if (!rootRef.current?.contains(target)) return;
      const keepOpen = target.closest("[data-feature-info-root], [data-feature-info-panel]");
      if (!keepOpen) closeFeatureInfo();
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [infoRowId, closeFeatureInfo]);

  function onCarouselScroll() {
    const root = carouselRef.current;
    if (!root || !root.children.length) return;
    const center = root.scrollLeft + root.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    Array.from(root.children).forEach((child, i) => {
      const el = child as HTMLElement;
      const mid = el.offsetLeft + el.offsetWidth / 2;
      const dist = Math.abs(mid - center);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    if (best !== mobileIndex) {
      setMobileIndex(best);
      const col = columns[best];
      if (col) onSelectColumn(col.id);
    }
  }

  return (
    <div
      ref={rootRef}
      className="plan-comparison"
      style={{ "--plan-cols": colCount } as React.CSSProperties}
    >
      {/* Desktop — ein Grid: Zeilen teilen sich, Linien sind symmetrisch */}
      <div className="plan-comparison-desktop">
        <div className="plan-comparison-layout" aria-label="Pakete vergleichen">
          <div className="plan-comparison-aside-cell plan-comparison-aside-cell--head">
            <span className="plan-comparison-label-heading">{asideHeading}</span>
            {inputRows.length > 0 ? (
              <div className="plan-comparison-aside-inputs">
                {inputRows.map((row) => (
                  <div key={row.id} className="plan-comparison-aside-input">
                    <span className="plan-comparison-row-title">{row.label}</span>
                    <BandSelect row={row} />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          {columns.map((col) => (
            <div key={`head-${col.id}`} className={pkgCellClass(col, selectedColumnId, "head")}>
              <button
                type="button"
                className="plan-comparison-package-head"
                onClick={() => onSelectColumn(col.id)}
                aria-pressed={col.id === selectedColumnId}
              >
                {col.empfohlen ? (
                  <span className="conversion-plan-badge">Empfohlen</span>
                ) : null}
                <span className="conversion-plan-name">{col.name}</span>
                <span className="conversion-plan-tagline">{col.subtitle}</span>
                <span className="conversion-plan-price">{col.priceLabel}</span>
                {priceHint ? (
                  <span className="conversion-plan-price-hint">{priceHint}</span>
                ) : null}
              </button>
            </div>
          ))}

          {featureRows.map((row) => {
            const infoOpen = infoRowId === row.id;

            return (
              <Fragment key={row.id}>
                <div
                  className={`plan-comparison-aside-cell${infoOpen ? " plan-comparison-aside-cell--expanded" : ""}`}
                >
                  <FeatureRowLabel
                    label={row.label}
                    detail={row.detail}
                    rowId={row.id}
                    open={infoOpen}
                    onToggle={toggleFeatureInfo}
                    showInfoPanel
                  />
                </div>
                {columns.map((col) => (
                  <div
                    key={`${row.id}-${col.id}`}
                    className={pkgCellClass(col, selectedColumnId, "body")}
                  >
                    <FeatureCell value={row.values[col.id] ?? "no"} />
                  </div>
                ))}
              </Fragment>
            );
          })}

          <div className="plan-comparison-aside-cell plan-comparison-aside-cell--foot">
            <PlanLeistungenHinweis />
          </div>
          {columns.map((col) => (
            <div key={`foot-${col.id}`} className={pkgCellClass(col, selectedColumnId, "foot")}>
              <button
                type="button"
                className={`plan-comparison-cta${col.id === selectedColumnId ? " plan-comparison-cta--primary" : ""}`}
                onClick={() => {
                  onSelectColumn(col.id);
                  onCta(col.id);
                }}
              >
                Anfragen
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile — Eingaben + Karussell */}
      <div className="plan-comparison-mobile">
        {inputRows.length > 0 ? (
          <div className="plan-comparison-mobile-inputs">
            {inputRows.map((row) => (
              <label key={row.id} className="plan-comparison-mobile-input">
                <span className="plan-comparison-mobile-input-label">{row.label}</span>
                <BandSelect row={row} />
              </label>
            ))}
          </div>
        ) : null}

        {openInfoRow?.detail?.trim() ? (
          <p
            id={`plan-feature-info-${openInfoRow.id}`}
            className="plan-comparison-feature-info plan-comparison-mobile-feature-info"
            data-feature-info-panel=""
            role="note"
          >
            {openInfoRow.detail}
          </p>
        ) : null}

        <div
          ref={carouselRef}
          className="plan-comparison-carousel"
          onScroll={onCarouselScroll}
        >
          {columns.map((col, index) => (
            <article
              key={col.id}
              className={`plan-comparison-mobile-card ${packageClass(col, selectedColumnId)}`}
              aria-current={index === mobileIndex ? "true" : undefined}
            >
              {col.empfohlen ? (
                <span className="conversion-plan-badge">Empfohlen</span>
              ) : null}
              <h3 className="conversion-plan-name">{col.name}</h3>
              <p className="conversion-plan-tagline">{col.subtitle}</p>
              <p className="conversion-plan-price">{col.priceLabel}</p>
              {priceHint ? (
                <p className="conversion-plan-price-hint">{priceHint}</p>
              ) : null}

              <ul className="plan-comparison-mobile-features">
                {featureRows.map((row) => (
                  <li key={row.id}>
                    <FeatureRowLabel
                      label={row.label}
                      detail={row.detail}
                      rowId={row.id}
                      open={infoRowId === row.id}
                      onToggle={toggleFeatureInfo}
                    />
                    <FeatureCell value={row.values[col.id] ?? "no"} />
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className={`plan-comparison-cta${col.id === selectedColumnId ? " plan-comparison-cta--primary" : ""}`}
                onClick={() => {
                  onSelectColumn(col.id);
                  onCta(col.id);
                }}
              >
                Anfragen
              </button>
            </article>
          ))}
        </div>

        <div className="plan-comparison-dots" role="tablist" aria-label="Paket wählen">
          {columns.map((col, index) => (
            <button
              key={col.id}
              type="button"
              role="tab"
              aria-selected={index === mobileIndex}
              aria-label={col.name}
              className={`plan-comparison-dot${index === mobileIndex ? " plan-comparison-dot--active" : ""}`}
              onClick={() => {
                setMobileIndex(index);
                onSelectColumn(col.id);
              }}
            />
          ))}
        </div>

        <PlanLeistungenHinweis />
      </div>
    </div>
  );
}
