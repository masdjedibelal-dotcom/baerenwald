"use client";

import type { ReactNode } from "react";

import {
  formatEinstellungenSchwelle,
  formatEinstellungenSchwellePreset,
} from "@/lib/portal2/einstellungen";
import { PORTAL_C } from "@/lib/portal2/tokens";
import { cn } from "@/lib/utils";

/** Mock `pf(k, val)` — Bezeichnung oben, Wert im Feld darunter. */
export function EinstellungenPfRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11.5px] font-bold tracking-wide text-text-tertiary">
        {label}
      </span>
      <div className="w-full rounded-[9px] border border-border-default bg-[#f3f4f3] px-3 py-2.5 text-[13.5px] font-semibold text-text-primary">
        {value}
      </div>
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

/** Mock Euro-Betrag + Schnellwahl-Pills (250 / 500 / 1k / 2k). */
export function EinstellungenEuroInput({
  value,
  onChange,
  disabled,
  presets = [250, 500, 1000, 2000],
  min = 0,
  max = 5000,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  presets?: readonly number[];
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
      <label className="relative block w-full max-w-[140px] shrink-0">
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={50}
          disabled={disabled}
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!Number.isFinite(n)) return;
            onChange(Math.min(max, Math.max(min, Math.round(n))));
          }}
          className="w-full rounded-[9px] border border-border-default bg-white py-2.5 pl-3 pr-8 text-[15px] font-semibold text-text-primary outline-none focus:border-accent disabled:opacity-70"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-text-tertiary">
          €
        </span>
      </label>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => {
          const active = value === p;
          return (
            <button
              key={p}
              type="button"
              disabled={disabled}
              onClick={() => onChange(p)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors disabled:opacity-60",
                active
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-border-default bg-white text-text-secondary hover:border-accent/30"
              )}
            >
              {formatEinstellungenSchwellePreset(p)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function EinstellungenInfoBox({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-[11px] border border-accent/20 bg-accent/[0.08] px-3.5 py-3 text-[13px] leading-[1.5] text-text-primary">
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-white"
        aria-hidden
      >
        i
      </span>
      <span>{children}</span>
    </div>
  );
}

/** Mock Auswahlkachel (Angebots-Freigabe). */
export function EinstellungenChoiceCard({
  selected,
  title,
  description,
  onSelect,
  disabled,
}: {
  selected: boolean;
  title: string;
  description: string;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-[11px] border px-3.5 py-3 text-left transition-colors disabled:opacity-60",
        selected
          ? "border-accent bg-accent/[0.08]"
          : "border-border-default bg-white hover:border-accent/30"
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2",
          selected ? "border-accent" : "border-[#c5cbc8]"
        )}
        aria-hidden
      >
        {selected ? (
          <span className="h-2 w-2 rounded-full bg-accent" />
        ) : null}
      </span>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-semibold text-text-primary">
          {title}
        </span>
        <span
          className="mt-0.5 block text-[12.5px] leading-snug"
          style={{ color: PORTAL_C.sub }}
        >
          {description}
        </span>
      </span>
    </button>
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

/** Euro-Betrag als Regler (z. B. Freigabebetrag 0–5000 € / 500er). */
export function EinstellungenEuroSlider({
  value,
  onChange,
  disabled,
  min = 0,
  max = 5000,
  step = 500,
  formatValue,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  formatValue?: (value: number) => string;
}) {
  const label =
    formatValue?.(value) ??
    new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        value={Number.isFinite(value) ? value : min}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full flex-1 cursor-pointer appearance-none rounded-full bg-border-default accent-[var(--accent,#2F5D50)] disabled:cursor-not-allowed disabled:opacity-60"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label="Betrag"
      />
      <span className="shrink-0 text-right font-[family-name:var(--font-display)] text-lg font-bold text-accent tabular-nums sm:w-[110px]">
        {label}
      </span>
    </div>
  );
}

/** Mock Toggle (Objekt-Regeln / Freigabe). */
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
