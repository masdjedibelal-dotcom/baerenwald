"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Pencil, Plus } from "lucide-react";

import { PortalDetailInfoBox } from "@/components/shared/PortalDetailUi";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { InfoTip } from "@/components/ui/InfoTip";
import {
  EINSTELLUNGEN_LOGO_HINT,
  formatEinstellungenSchwelle,
  snapEinstellungenSchwelle,
} from "@/lib/portal2/einstellungen";
import {
  PORTAL_NESTED_PANEL_CLASS,
  PORTAL_SECTION_CARD_CLASS,
} from "@/lib/portal2/section-card-contract";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { cn } from "@/lib/utils";

/**
 * Accent-Kreis „+“ für Section-Köpfe (Hinzufügen).
 * Regel: Section-Add = dieser Button; Listen-CTA oben rechts = `btn-pill-primary`;
 * Sticky/entscheidend = `portal-action-btn`.
 */
export function PortalSectionAddButton({
  onClick,
  label = "Hinzufügen",
  disabled,
  className,
}: {
  onClick: () => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white shadow-sm transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      <Plus className="h-4 w-4" aria-hidden strokeWidth={2.25} />
    </button>
  );
}

/** Read-only Zeile: Label links, Wert rechts — scannbar auf Mobil. */
export function EinstellungenPfRow({
  label,
  value,
  className,
}: {
  label: ReactNode;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-baseline justify-between gap-3 py-2.5",
        className
      )}
    >
      <div className="max-w-[44%] shrink-0 text-[13px] font-semibold leading-snug text-text-primary">
        {label}
      </div>
      <p className="min-w-0 flex-1 text-right text-[14.5px] font-semibold leading-snug text-text-primary [overflow-wrap:anywhere]">
        {value}
      </p>
    </div>
  );
}

/** Liste von PfRows mit Trennlinien. */
export function EinstellungenPfList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("divide-y divide-border-light", className)}>
      {children}
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
      <span className="text-[13px] font-semibold text-text-primary">{label}</span>
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

/** Weiße Section-Card — eine pro Einstellungs-Block (kein Outer-Wrapper). */
export function EinstellungenSectionCard({
  title,
  onEdit,
  editLabel = "Bearbeiten",
  onAdd,
  addLabel = "Hinzufügen",
  trailing,
  children,
  className,
}: {
  title?: string;
  onEdit?: () => void;
  editLabel?: string;
  onAdd?: () => void;
  addLabel?: string;
  trailing?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(PORTAL_SECTION_CARD_CLASS, "space-y-3 p-4", className)}>
      {title ? (
        <EinstellungenSectionHeader
          title={title}
          onEdit={onEdit}
          editLabel={editLabel}
          onAdd={onAdd}
          addLabel={addLabel}
          trailing={trailing}
        />
      ) : null}
      {children}
    </section>
  );
}

/** Logo-Zeile: Vorschau + Upload links, InfoTip rechts (Hinweis nicht inline). */
export function EinstellungenLogoRow({
  preview,
  fallbackLabel,
  hint = EINSTELLUNGEN_LOGO_HINT,
  readOnly,
  uploadBusy,
  hasLogo,
  onUploadClick,
  fileInput,
}: {
  preview: ReactNode;
  fallbackLabel: string;
  hint?: string;
  readOnly?: boolean;
  uploadBusy?: boolean;
  hasLogo?: boolean;
  onUploadClick?: () => void;
  fileInput?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3.5">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border-default bg-white">
        {preview ?? (
          <span className="font-[family-name:var(--font-display)] text-sm font-bold text-text-primary">
            {fallbackLabel}
          </span>
        )}
      </div>
      {!readOnly && onUploadClick ? (
        <>
          {fileInput}
          <button
            type="button"
            disabled={uploadBusy}
            onClick={onUploadClick}
            className="btn-pill-outline portal-btn-compact shrink-0 disabled:opacity-50"
          >
            {uploadBusy
              ? "Wird hochgeladen…"
              : hasLogo
                ? "Logo ersetzen"
                : "Logo hochladen"}
          </button>
        </>
      ) : null}
      <div className="min-w-0 flex-1" aria-hidden />
      <InfoTip tip={hint} label="Logo-Hinweis" popoverAlign="end" />
    </div>
  );
}

/** Abschnittskopf: Label + optionale Aktionen / Plus (Add) / Stift (Edit). */
export function EinstellungenSectionHeader({
  title,
  onEdit,
  editLabel = "Bearbeiten",
  onAdd,
  addLabel = "Hinzufügen",
  trailing,
}: {
  title: string;
  onEdit?: () => void;
  editLabel?: string;
  /** Accent-Plus — für neue Einträge (nicht Bearbeiten). */
  onAdd?: () => void;
  addLabel?: string;
  /** z. B. ⋯-Menü links vom Stift/Plus. */
  trailing?: ReactNode;
}) {
  const hasActions = Boolean(onEdit || onAdd || trailing);
  return (
    <div className="mb-1 flex items-center justify-between gap-2">
      <p className="text-[12.5px] font-bold uppercase tracking-wide text-text-secondary">
        {title}
      </p>
      {hasActions ? (
        <div className="flex items-center gap-1.5">
          {trailing}
          {onAdd ? (
            <PortalSectionAddButton onClick={onAdd} label={addLabel} />
          ) : null}
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              aria-label={editLabel}
              title={editLabel}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white shadow-sm transition-colors hover:bg-accent-hover"
            >
              <Pencil className="h-4 w-4" aria-hidden strokeWidth={2.25} />
            </button>
          ) : null}
        </div>
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
  onSave: () => void | Promise<void>;
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

  async function handleSave() {
    await onSave();
  }

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
      onConfirm={() => void handleSave()}
      confirmLabel={saving ? "Speichern…" : saveLabel}
      confirmDisabled={Boolean(saving || saveDisabled)}
    >
      <div
        className="flex flex-col gap-3"
        onInput={() => setTouched(true)}
        onChange={() => setTouched(true)}
      >
        {children}
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
 * Flacher Einstellungs-Block — delegiert an EinstellungenSectionCard.
 * @deprecated Bevorzugt EinstellungenSectionCard.
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
    <EinstellungenSectionCard title={title} onEdit={onEdit} className={className}>
      {children}
    </EinstellungenSectionCard>
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
  nested,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
  /** Flach innerhalb EinstellungenSectionCard — keine Card-in-Card. */
  nested?: boolean;
}) {
  return (
    <div
      className={cn(
        nested
          ? PORTAL_NESTED_PANEL_CLASS
          : "rounded-[11px] border border-border-default bg-[var(--p2-panel,#fff)] px-3.5 py-[13px] shadow-sm"
      )}
    >
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
  nested,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  title: ReactNode;
  description?: ReactNode;
  /** Flach innerhalb EinstellungenSectionCard — keine Card-in-Card. */
  nested?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex w-full items-start gap-3",
        nested
          ? PORTAL_NESTED_PANEL_CLASS
          : "rounded-[11px] border border-border-default bg-[var(--p2-panel,#fff)] px-3.5 py-[13px] shadow-sm",
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
