"use client";

import type { ReactNode } from "react";

import { formatEinstellungenSchwelle } from "@/lib/portal2/einstellungen";
import { PORTAL_C } from "@/lib/portal2/tokens";
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

/** Mock `card(title, body)` — screenSettings Freigabe-Regeln. */
export function EinstellungenCard({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("portal-einstellungen-card", className)}>
      {title ? (
        <h3
          className="portal-einstellungen-card-title"
          style={{ fontFamily: "var(--p2-font-head, " + PORTAL_C.head + ")" }}
        >
          {title}
        </h3>
      ) : null}
      {children}
    </section>
  );
}

/** Mock globaler Schwellen-Slider + Geldanzeige (gap 12). */
export function EinstellungenSchwelleSlider({
  value,
  onChange,
  disabled,
  min = 0,
  max = 2000,
  step = 50,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="portal-einstellungen-range min-w-0 flex-1"
        aria-valuetext={formatEinstellungenSchwelle(value)}
      />
      <span
        className="w-[110px] shrink-0 text-right text-[20px] font-bold text-accent"
        style={{ fontFamily: "var(--p2-font-head, " + PORTAL_C.head + ")" }}
      >
        {formatEinstellungenSchwelle(value)}
      </span>
    </div>
  );
}

/** Mock Objekt-Schwellen-Zeile — nur Name + Betrag. */
export function EinstellungenObjektSchwelleRow({
  name,
  value,
}: {
  name: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[9px] border border-border-default px-[13px] py-[11px]">
      <span className="min-w-0 truncate text-[13.5px] font-semibold text-text-primary">
        {name}
      </span>
      <span className="shrink-0 text-[13.5px] font-semibold text-accent">
        {value}
      </span>
    </div>
  );
}

/** Mock Toggle (Objekt-Regeln / Notfall-Autopass). */
export function EinstellungenToggle({
  checked,
  onChange,
  disabled,
  title,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  title: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-3 rounded-[11px] border border-border-default px-3.5 py-[13px] text-left disabled:opacity-60"
    >
      <span
        className={cn(
          "relative mt-0.5 h-[26px] w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-accent" : "bg-[#cfd4d2]"
        )}
        aria-hidden
      >
        <span
          className={cn(
            "absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-[left]",
            checked ? "left-[21px]" : "left-[3px]"
          )}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-semibold text-text-primary">
          {title}
        </span>
        {description ? (
          <span
            className="mt-1 block text-[13px] leading-snug"
            style={{ color: PORTAL_C.sub }}
          >
            {description}
          </span>
        ) : null}
      </span>
    </button>
  );
}
