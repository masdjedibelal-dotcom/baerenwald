"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type PortalListTableColumn = {
  key: string;
  label: string;
  className?: string;
  /** Desktop-Breite / Flex, z. B. `min-w-0 flex-1` */
  widthClass?: string;
};

type PortalListTableProps = {
  columns: PortalListTableColumn[];
  children: ReactNode;
  empty?: ReactNode;
  /** Zeile unter der Tabelle (z. B. „Hinzufügen“) */
  footer?: ReactNode;
  className?: string;
  /** Visuell ausgeblendeter Header auf sehr schmalen Screens */
  hideHeaderOnMobile?: boolean;
};

/**
 * Einheitliche Portal-Listentabelle (Header + Zeilen + optional Footer).
 * Gleiches Chrome wie `portal-list-panel`.
 */
export function PortalListTable({
  columns,
  children,
  empty,
  footer,
  className,
  hideHeaderOnMobile = false,
}: PortalListTableProps) {
  return (
    <div className={cn("portal-list-panel", className)}>
      <div
        className={cn(
          "grid gap-3 bg-[#f7f8f7] px-3.5 py-2.5 text-[11.5px] font-bold uppercase tracking-wide text-text-tertiary",
          hideHeaderOnMobile && "max-sm:hidden",
          gridColsClass(columns.length)
        )}
        role="row"
      >
        {columns.map((col) => (
          <div
            key={col.key}
            className={cn(col.widthClass, col.className)}
            role="columnheader"
          >
            {col.label}
          </div>
        ))}
      </div>
      <div className="portal-list-rows divide-y divide-[var(--p2-line2,rgba(0,0,0,0.05))]">
        {children}
        {empty}
      </div>
      {footer ? (
        <div className="border-t border-[var(--p2-line2,rgba(0,0,0,0.05))] bg-[#fafaf9] px-3.5 py-3">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

type PortalListTableRowProps = {
  columns: number;
  children: ReactNode;
  className?: string;
};

export function PortalListTableRow({
  columns,
  children,
  className,
}: PortalListTableRowProps) {
  return (
    <div
      className={cn(
        "grid items-center gap-3 px-3.5 py-3",
        gridColsClass(columns),
        className
      )}
      role="row"
    >
      {children}
    </div>
  );
}

export function PortalListTableCell({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  /** Mobile: kleine Spaltenbezeichnung über dem Wert */
  label?: string;
}) {
  return (
    <div className={cn("min-w-0", className)} role="cell">
      {label ? (
        <span className="mb-0.5 block text-[11px] font-bold uppercase tracking-wide text-text-tertiary sm:hidden">
          {label}
        </span>
      ) : null}
      {children}
    </div>
  );
}

function gridColsClass(n: number): string {
  if (n <= 2) return "grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto]";
  if (n === 3) {
    return "grid-cols-1 sm:grid-cols-[minmax(0,1.4fr)_minmax(7rem,0.7fr)_auto]";
  }
  if (n === 4) {
    return "grid-cols-1 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(5rem,0.55fr)_auto]";
  }
  return "grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(8rem,1fr))]";
}
