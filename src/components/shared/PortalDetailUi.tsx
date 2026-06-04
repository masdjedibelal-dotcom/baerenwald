"use client";

import { Info } from "lucide-react";

import { cn } from "@/lib/utils";

export function PortalConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmVariant = "primary",
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: "primary" | "danger";
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl border border-border-default bg-surface-card p-5 shadow-xl">
        <h4 className="font-display text-lg font-semibold text-text-primary">{title}</h4>
        <p className="portal-text-body mt-2 text-text-secondary">{description}</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="btn-pill-outline portal-btn !px-4 !py-2.5"
          >
            Abbrechen
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={cn(
              confirmVariant === "danger"
                ? "btn-pill-outline portal-btn !border-red-200 !text-red-800 !px-4 !py-2.5"
                : "btn-pill-primary portal-btn !px-4 !py-2.5",
              loading && "opacity-60"
            )}
          >
            {loading ? "Wird gesendet…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PortalDetailHero({
  title,
  metaLine,
  statusLabel,
  statusPillClass,
  subtitle,
}: {
  title: string;
  metaLine?: string;
  statusLabel: string;
  statusPillClass: string;
  subtitle?: string;
}) {
  return (
    <header className="space-y-2">
      <h3 className="font-display text-xl font-semibold leading-snug text-text-primary sm:text-2xl">
        {title}
      </h3>
      {metaLine ? <p className="portal-text-body text-accent">{metaLine}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <span className={statusPillClass}>{statusLabel}</span>
        {subtitle ? (
          <span className="portal-text-meta text-text-secondary">{subtitle}</span>
        ) : null}
      </div>
    </header>
  );
}

export function PortalDetailInfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="portal-text-body flex gap-3 rounded-xl border border-border-light bg-muted/30 px-3 py-3.5 text-text-secondary">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
      <p>{children}</p>
    </div>
  );
}

export function PortalDetailSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-2.5", className)}>
      <h4 className="portal-text-section">{title}</h4>
      {children}
    </section>
  );
}

export function PortalDetailKeyValues({
  rows,
}: {
  rows: Array<{ label: string; value: React.ReactNode }>;
}) {
  const visible = rows.filter((r) => r.value != null && r.value !== "" && r.value !== "—");
  if (!visible.length) return null;
  return (
    <dl className="portal-text-body overflow-hidden rounded-xl border border-border-light bg-muted/20">
      {visible.map((row, i) => (
        <div
          key={row.label}
          className={cn(
            "grid grid-cols-1 gap-1 px-3 py-3 sm:grid-cols-[38%_1fr]",
            i < visible.length - 1 && "border-b border-border-light"
          )}
        >
          <dt className="portal-text-meta text-text-tertiary">{row.label}</dt>
          <dd className="font-medium text-text-primary">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function PortalDetailLeistungenList({
  items,
}: {
  items: Array<{
    id: string;
    title: string;
    beschreibung?: string | null;
    meta?: string;
  }>;
}) {
  if (!items.length) return null;
  return (
    <ul className="space-y-2">
      {items.map((p) => (
        <li
          key={p.id}
          className="portal-text-body rounded-lg border border-border-light bg-surface-card px-3 py-3"
        >
          <p className="font-medium text-text-primary">{p.title}</p>
          {p.beschreibung ? (
            <p className="portal-text-meta mt-1 text-text-secondary">{p.beschreibung}</p>
          ) : null}
          {p.meta ? (
            <p className="portal-text-meta mt-1 text-text-tertiary">{p.meta}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function PortalDetailLayout({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-col">
      <div className="portal-detail-layout space-y-5 pb-2">{children}</div>
      {footer ? (
        <div className="sticky bottom-0 z-10 -mx-4 mt-3 border-t border-border-light bg-surface-card/95 px-4 py-3.5 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur-sm lg:static lg:mx-0 lg:mt-5 lg:shadow-none lg:backdrop-blur-none">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export function PortalDetailStickyActions({
  primaryLabel,
  onPrimary,
  primaryDisabled,
  primaryLoading,
  primaryType = "button",
  primaryForm,
  secondaryLabel,
  onSecondary,
  secondaryDisabled,
}: {
  primaryLabel: string;
  onPrimary?: () => void;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  primaryType?: "button" | "submit";
  primaryForm?: string;
  secondaryLabel?: string;
  onSecondary?: () => void;
  secondaryDisabled?: boolean;
}) {
  return (
    <div className="flex gap-2">
      {secondaryLabel ? (
        <button
          type="button"
          disabled={secondaryDisabled || primaryLoading}
          onClick={onSecondary}
          className="btn-pill-outline portal-btn min-w-0 flex-1 !py-3"
        >
          {secondaryLabel}
        </button>
      ) : null}
      <button
        type={primaryType}
        form={primaryForm}
        disabled={primaryDisabled || primaryLoading}
        onClick={primaryType === "button" ? onPrimary : undefined}
        className={cn(
          "btn-pill-primary portal-btn min-w-0 flex-1 !py-3",
          (primaryDisabled || primaryLoading) && "opacity-60"
        )}
      >
        {primaryLoading ? "Wird gesendet…" : primaryLabel}
      </button>
    </div>
  );
}

export function PortalDetailError({ message }: { message: string }) {
  return (
    <p className="portal-text-body rounded-lg bg-red-50 px-3 py-2.5 text-red-800" role="alert">
      {message}
    </p>
  );
}

export function PortalDetailSuccessBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="portal-text-body space-y-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3.5 text-emerald-900">
      {children}
    </div>
  );
}

export function PortalDetailMilestoneList({
  items,
}: {
  items: Array<{ id: string; titel: string; erledigt: boolean }>;
}) {
  if (!items.length) return null;
  return (
    <ul className="space-y-2">
      {items.map((m) => (
        <li
          key={m.id}
          className={cn(
            "portal-text-body flex items-start gap-3 rounded-lg border px-3 py-3",
            m.erledigt
              ? "border-emerald-200 bg-emerald-50/80"
              : "border-border-light bg-surface-card"
          )}
        >
          <span
            className={cn(
              "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
              m.erledigt
                ? "bg-emerald-600 text-white"
                : "border border-border-default bg-surface-page text-transparent"
            )}
            aria-hidden
          >
            ✓
          </span>
          <span
            className={cn(
              "font-medium text-text-primary",
              m.erledigt && "text-text-secondary line-through decoration-text-tertiary"
            )}
          >
            {m.titel}
          </span>
          <span className="sr-only">{m.erledigt ? "Erledigt" : "Offen"}</span>
        </li>
      ))}
    </ul>
  );
}
