"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Pencil } from "lucide-react";

import {
  formatEinstellungenSchwelle,
  snapEinstellungenSchwelle,
} from "@/lib/portal2/einstellungen";
import { PortalDetailInfoBox } from "@/components/shared/PortalDetailUi";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { cn } from "@/lib/utils";

/** Read-only Feld: Label oben, Wert als Klartext (kein Box-Fill). */
export function EinstellungenPfRow({
  label,
  value,
}: {
  label: ReactNode;
  value: string;
}) {
  return (
    <div className="min-w-0 py-0.5">
      <div className="portal-text-label normal-case tracking-wide text-text-tertiary">
        {label}
      </div>
      <p className="portal-text-card-title mt-0.5 font-semibold">{value}</p>
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
      <span className="portal-text-label normal-case tracking-wide text-text-tertiary">
        {label}
      </span>
      <input
        type={type}
        className="portal-field w-full"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

/** Alias — gleiche Info-Box wie Detail-Screens. */
export function EinstellungenInfoBox({ children }: { children: ReactNode }) {
  return <PortalDetailInfoBox>{children}</PortalDetailInfoBox>;
}

/** Abschnittskopf: Label + Stift (öffnet Edit-Modal). */
export function EinstellungenSectionHeader({
  title,
  onEdit,
  editLabel = "Bearbeiten",
}: {
  title: string;
  onEdit?: () => void;
  editLabel?: string;
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <p className="portal-text-label normal-case text-text-tertiary">{title}</p>
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          aria-label={editLabel}
          title={editLabel}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border-default bg-white text-text-secondary transition-colors hover:border-accent/40 hover:text-accent"
        >
          <Pencil className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

/** @deprecated Alias — nutze EinstellungenSectionHeader. */
export function EinstellungenSectionLabel({ children }: { children: string }) {
  return <EinstellungenSectionHeader title={children} />;
}

/** Edit: mobil Bottom-Sheet, Desktop Side-Over (`variant="edit"`). */
export function EinstellungenEditModal({
  open,
  title,
  subtitle,
  children,
  onClose,
  onSave,
  saving,
  saveDisabled,
  saveLabel = "Speichern",
  dirty: dirtyProp,
}: {
  open: boolean;
  title: string;
  subtitle?: string | null;
  children: ReactNode;
  onClose: () => void;
  onSave: () => void;
  saving?: boolean;
  saveDisabled?: boolean;
  saveLabel?: string;
  /** Wenn gesetzt: überschreibt Auto-Dirty aus Form-Input. */
  dirty?: boolean;
}) {
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (!open) setTouched(false);
  }, [open]);

  const dirty = dirtyProp ?? touched;

  return (
    <PortalModalShell
      open={open}
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      variant="edit"
      dirty={dirty && !saving}
      closeOnBackdrop={!saving}
      busy={Boolean(saving)}
    >
      <div
        className="flex flex-col gap-3"
        onInput={() => setTouched(true)}
        onChange={() => setTouched(true)}
      >
        {children}
      </div>
      <div className="portal-action-row mt-5">
        <button
          type="button"
          className="portal-action-btn portal-action-btn--secondary"
          disabled={saving}
          onClick={onClose}
        >
          Abbrechen
        </button>
        <button
          type="button"
          className="portal-action-btn portal-action-btn--primary"
          disabled={saving || saveDisabled}
          onClick={onSave}
        >
          {saving ? "Speichern…" : saveLabel}
        </button>
      </div>
    </PortalModalShell>
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
        <span className="portal-text-card-title block">{title}</span>
        <span className="portal-text-meta mt-0.5 block" style={{ color: PORTAL_VAR.sub }}>
          {description}
        </span>
      </span>
    </button>
  );
}

/** Desktop 2 Spalten, Mobile 1 — für Klartext-Felder mit etwas Luft. */
export function EinstellungenGrid2({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2", className)}>
      {children}
    </div>
  );
}

/**
 * Flacher Einstellungs-Block (Handwerker-Contract).
 * Keine weiße Card — nur SectionHeader + Inhalt.
 * @deprecated Bevorzugt EinstellungenSectionHeader + children direkt.
 */
export function EinstellungenCard({
  title,
  children,
  className,
  onEdit,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  onEdit?: () => void;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      {title ? (
        <EinstellungenSectionHeader title={title} onEdit={onEdit} />
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
  max = 5000,
  step = 500,
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
        className="portal-text-title w-[110px] shrink-0 text-right text-accent tabular-nums"
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
      <span className="portal-text-card-title min-w-0 truncate">{name}</span>
      <span className="portal-text-card-title shrink-0 text-accent">{value}</span>
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
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="portal-text-meta" style={{ color: PORTAL_VAR.sub }}>
          Schwellenwert
        </span>
        <span className="portal-text-card-title tabular-nums text-accent">
          {label}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        value={Number.isFinite(value) ? value : min}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-border-default accent-[var(--accent,#2F5D50)] disabled:cursor-not-allowed disabled:opacity-60"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label="Freigabeschwelle"
      />
    </div>
  );
}

/** Toggle-Karte + optionaler Inhalt darunter (gleicher Sheet-Card-Stil). */
export function EinstellungenSheetCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-[11px] border border-border-default bg-white px-3.5 py-[13px]">
      <p className="portal-text-card-title">{title}</p>
      {description ? (
        <p
          className="portal-text-meta mt-1"
          style={{ color: PORTAL_VAR.sub }}
        >
          {description}
        </p>
      ) : null}
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

/** @deprecated Alias — gleicher Slider wie EinstellungenEuroSlider (0–5000 / 500er). */
export function EinstellungenEuroInput({
  value,
  onChange,
  disabled,
  min = 0,
  max = 5000,
  step = 500,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  /** @deprecated Ignoriert — Slider statt Pills */
  presets?: readonly number[];
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <EinstellungenEuroSlider
      value={snapEinstellungenSchwelle(value)}
      onChange={(v) => onChange(snapEinstellungenSchwelle(v))}
      disabled={disabled}
      min={min}
      max={max}
      step={step}
      formatValue={formatEinstellungenSchwelle}
    />
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
  title: ReactNode;
  description?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex w-full items-start gap-3 rounded-[11px] border border-border-default px-3.5 py-[13px]",
        disabled && "opacity-60"
      )}
    >
      <button
        type="button"
        disabled={disabled}
        aria-pressed={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-[26px] w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed",
          checked ? "bg-accent" : "bg-[#cfd4d2]"
        )}
      >
        <span
          className={cn(
            "absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-[left]",
            checked ? "left-[21px]" : "left-[3px]"
          )}
          aria-hidden
        />
      </button>
      <div className="min-w-0 flex-1">
        <div className="portal-text-card-title">{title}</div>
        {description ? (
          <div
            className="portal-text-meta mt-1"
            style={{ color: PORTAL_VAR.sub }}
          >
            {description}
          </div>
        ) : null}
      </div>
    </div>
  );
}
