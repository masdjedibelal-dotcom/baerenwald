"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Mock `pf(k, val)` — Label 12.5px links, Wert 13.5px rechts. */
export function EinstellungenPfRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[9px] border border-border-default px-3.5 py-[11px]">
      <span className="text-[12.5px] font-semibold text-text-tertiary">
        {label}
      </span>
      <span className="text-right text-[13.5px] font-semibold text-text-primary">
        {value}
      </span>
    </div>
  );
}

/** Mock `edField(label, obj, key)`. */
export function EinstellungenEdField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11.5px] font-bold tracking-wide text-text-tertiary">
        {label}
      </span>
      <input
        type={type}
        className="w-full rounded-[9px] border border-border-default bg-white px-3 py-2.5 text-[13.5px] text-text-primary outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-70"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

/** Mock `grid2` — Desktop 2 Spalten, Mobile 1, gap 11. */
export function EinstellungenGrid2({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-[11px] sm:grid-cols-2", className)}>
      {children}
    </div>
  );
}

export function EinstellungenSectionLabel({ children }: { children: string }) {
  return (
    <p className="mb-2 text-[11.5px] font-bold text-text-tertiary">{children}</p>
  );
}
