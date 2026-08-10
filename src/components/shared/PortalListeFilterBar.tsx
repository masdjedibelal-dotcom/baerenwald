"use client";

import type { ReactNode } from "react";

import { PortalListeFilterChip } from "@/components/shared/PortalListeChrome";
import { cn } from "@/lib/utils";

export type PortalListeFilterOption<T extends string> = {
  id: T;
  label: string;
  count?: number;
  countBadge?: number | null;
  tone?: "default" | "offen";
};

type Props<T extends string> = {
  value: T;
  onChange: (id: T) => void;
  options: readonly PortalListeFilterOption<T>[];
  /** @deprecated Sheet-Titel — Chips werden überall gezeigt. */
  sheetTitle?: string;
  className?: string;
};

/**
 * Vorgänge-Filter: Chip-Reihe auf Desktop und Mobil (horizontal scrollbar).
 */
export function PortalListeFilterBar<T extends string>({
  value,
  onChange,
  options,
  className,
}: Props<T>) {
  return (
    <div
      className={cn(
        "-mx-1 flex gap-2 overflow-x-auto px-1 py-3.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      {options.map((opt) => (
        <PortalListeFilterChip
          key={opt.id}
          active={opt.id === value}
          onClick={() => onChange(opt.id)}
          count={opt.count}
          countBadge={opt.countBadge}
          tone={opt.tone ?? (opt.id === "offen" ? "offen" : "default")}
        >
          {opt.label}
        </PortalListeFilterChip>
      ))}
    </div>
  );
}

/** Hilfs-Wrapper — API-Kompatibilität. */
export function PortalListeFilterSheetHint({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
