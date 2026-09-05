'use client';

import type { ReactNode } from "react";

import { useIsPortalMobile } from "@/lib/portal2/use-is-portal-mobile";
import { cn } from "@/lib/utils";

export type PortalEntityListColumn = {
  key: string;
  label: string;
  /** Desktop: optional right-aligned */
  align?: "left" | "right";
  /** Anteil am Grid, Default 1fr */
  width?: string;
};

export type PortalEntityListRow = {
  id: string;
  /** Desktop-Zellen in gleicher Reihenfolge wie columns */
  cells: ReactNode[];
  /** Mobile: Primärtitel */
  title: string;
  /** Mobile: optional Badge neben Titel */
  badge?: ReactNode;
  /** Mobile: Meta-Zeilen unter dem Titel */
  meta?: ReactNode;
  /** ⋮-Menü (PortalActionMenu) */
  menu?: ReactNode;
  onClick?: () => void;
};

type Props = {
  columns: PortalEntityListColumn[];
  rows: PortalEntityListRow[];
  className?: string;
  /** Accessibility */
  ariaLabel?: string;
};

/**
 * CRM-Parität: Desktop flache Tabellenliste, Mobile Entity-Cards.
 * Keine Checkboxen / Bulk — Portal-Objektakte braucht das nicht.
 */
export function PortalEntityList({
  columns,
  rows,
  className,
  ariaLabel,
}: Props) {
  const isMobile = useIsPortalMobile();
  const cols = columns
    .map((c) => c.width ?? "minmax(0, 1fr)")
    .concat("44px")
    .join(" ");

  if (isMobile) {
    return (
      <ul
        className={cn("portal-entity-cards", className)}
        aria-label={ariaLabel}
      >
        {rows.map((r) => (
          <li key={r.id}>
            <div className="portal-entity-card-row">
              {r.onClick ? (
                <button
                  type="button"
                  className="portal-entity-card-hit"
                  onClick={r.onClick}
                >
                  <div className="portal-entity-card-top">
                    <span className="portal-entity-card-name">{r.title}</span>
                    {r.badge}
                  </div>
                  {r.meta ? (
                    <div className="portal-entity-card-meta">{r.meta}</div>
                  ) : null}
                </button>
              ) : (
                <div className="portal-entity-card-hit portal-entity-card-hit--static">
                  <div className="portal-entity-card-top">
                    <span className="portal-entity-card-name">{r.title}</span>
                    {r.badge}
                  </div>
                  {r.meta ? (
                    <div className="portal-entity-card-meta">{r.meta}</div>
                  ) : null}
                </div>
              )}
              {r.menu ? (
                <div
                  className="portal-entity-row-actions"
                  onClick={(e) => e.stopPropagation()}
                >
                  {r.menu}
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div
      className={cn("portal-entity-list", className)}
      aria-label={ariaLabel}
      role="table"
    >
      <div
        className="portal-entity-list__head"
        style={{ gridTemplateColumns: cols }}
        role="row"
      >
        {columns.map((c) => (
          <span
            key={c.key}
            role="columnheader"
            style={c.align === "right" ? { textAlign: "right" } : undefined}
          >
            {c.label}
          </span>
        ))}
        <span aria-hidden />
      </div>
      {rows.map((r) => (
        <div
          key={r.id}
          className="portal-entity-list__row"
          style={{ gridTemplateColumns: cols }}
          role="row"
        >
          {r.onClick ? (
            <button
              type="button"
              className="portal-entity-list__hit"
              onClick={r.onClick}
            >
              {r.cells.map((cell, i) => (
                <span
                  key={columns[i]?.key ?? i}
                  className={
                    i === 0
                      ? "portal-entity-list__name"
                      : "portal-entity-list__dim"
                  }
                  style={
                    columns[i]?.align === "right"
                      ? { textAlign: "right" }
                      : undefined
                  }
                  role="cell"
                >
                  {cell}
                </span>
              ))}
            </button>
          ) : (
            <div className="portal-entity-list__hit portal-entity-list__hit--static">
              {r.cells.map((cell, i) => (
                <span
                  key={columns[i]?.key ?? i}
                  className={
                    i === 0
                      ? "portal-entity-list__name"
                      : "portal-entity-list__dim"
                  }
                  style={
                    columns[i]?.align === "right"
                      ? { textAlign: "right" }
                      : undefined
                  }
                  role="cell"
                >
                  {cell}
                </span>
              ))}
            </div>
          )}
          <div
            className="portal-entity-row-actions"
            onClick={(e) => e.stopPropagation()}
            role="cell"
          >
            {r.menu ?? null}
          </div>
        </div>
      ))}
    </div>
  );
}
