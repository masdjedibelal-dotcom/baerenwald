"use client";

import { Info } from "lucide-react";

import {
  LeistungStatusDot,
  resolvePortalLeistungStatusAmpel,
} from "@/components/shared/LeistungStatusDot";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { cn } from "@/lib/utils";
import { stripHtmlToPlainText } from "@/lib/portal/portal-display";

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
  return (
    <PortalModalShell
      open={open}
      title={title}
      onClose={onCancel}
      variant="confirm"
    >
      <p className="portal-text-body text-text-secondary">{description}</p>
      <div className="portal-confirm-actions mt-5">
        <button
          type="button"
          disabled={loading}
          onClick={onConfirm}
          className={cn(
            "portal-action-btn portal-confirm-actions-primary",
            confirmVariant === "danger"
              ? "portal-action-btn--ghost !border-red-200 !text-red-800"
              : "portal-action-btn--primary",
            loading && "opacity-60"
          )}
        >
          {loading ? "Wird gesendet…" : confirmLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="portal-action-btn portal-action-btn--secondary portal-confirm-actions-cancel"
        >
          Abbrechen
        </button>
      </div>
    </PortalModalShell>
  );
}

export function PortalDetailHead({
  title,
  metaLine,
  statusLabel,
  statusPillClass,
  statusPillStyle,
  subtitle,
  titleBadges,
  actions,
}: {
  title: string;
  metaLine?: string;
  statusLabel?: string;
  statusPillClass?: string;
  statusPillStyle?: { color: string; backgroundColor: string };
  /** Meta neben Status-Pill (Legacy Hero). */
  subtitle?: string;
  /** Badges/Chips neben dem Titel. */
  titleBadges?: React.ReactNode;
  /** CTA-Zeile rechts (Desktop) / unter dem Head (Mobile). */
  actions?: React.ReactNode;
}) {
  const showStatusRow = Boolean(statusLabel?.trim()) || Boolean(subtitle);
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="portal-text-title">{title}</h3>
          {titleBadges}
        </div>
        {metaLine ? (
          <p className="portal-text-meta">{metaLine}</p>
        ) : null}
        {showStatusRow ? (
          <div className="flex flex-wrap items-center gap-2">
            {statusLabel?.trim() ? (
              <span
                className={cn(
                  "portal-status-pill",
                  !statusPillStyle && statusPillClass
                )}
                style={statusPillStyle}
              >
                {statusLabel}
              </span>
            ) : null}
            {subtitle ? (
              <span className="portal-text-meta text-text-secondary">
                {subtitle}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
          {actions}
        </div>
      ) : null}
    </header>
  );
}

/** @deprecated Nutze PortalDetailHead — bleibt als kompatibler Thin-Wrapper. */
export function PortalDetailHero({
  title,
  metaLine,
  statusLabel,
  statusPillClass,
  statusPillStyle,
  subtitle,
  titleBadges,
  actions,
}: {
  title: string;
  metaLine?: string;
  statusLabel?: string;
  statusPillClass?: string;
  statusPillStyle?: { color: string; backgroundColor: string };
  subtitle?: string;
  titleBadges?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <PortalDetailHead
      title={title}
      metaLine={metaLine}
      statusLabel={statusLabel}
      statusPillClass={statusPillClass}
      statusPillStyle={statusPillStyle}
      subtitle={subtitle}
      titleBadges={titleBadges}
      actions={actions}
    />
  );
}

export function PortalDetailInfoBox({
  children,
  variant = "info",
}: {
  children: React.ReactNode;
  variant?: "info" | "warning";
}) {
  if (variant === "warning") {
    return (
      <div className="portal-text-body flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3.5 text-amber-950">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
        <div className="min-w-0">{children}</div>
      </div>
    );
  }
  return (
    <div className="portal-text-body flex gap-3 rounded-xl border border-border-light bg-muted/30 px-3 py-3.5 text-text-secondary">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
      <div className="min-w-0">{children}</div>
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
    <dl className="portal-text-body divide-y divide-border-light">
      {visible.map((row) => (
        <div
          key={row.label}
          className="grid grid-cols-1 gap-0.5 py-2.5 sm:grid-cols-[38%_1fr] sm:items-baseline sm:gap-4"
        >
          <dt className="portal-text-label normal-case tracking-wide text-text-tertiary">
            {row.label}
          </dt>
          <dd className="portal-text-meta text-text-primary">{row.value}</dd>
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
    <ul className="portal-text-body overflow-hidden rounded-xl border border-border-light bg-muted/20">
      {items.map((p, i) => (
        <li
          key={p.id}
          className={cn(
            "px-3 py-3",
            i < items.length - 1 && "border-b border-border-light"
          )}
        >
          <p className="portal-text-card-title font-semibold">
            {stripHtmlToPlainText(p.title) || p.title}
          </p>
          {p.beschreibung ? (
            <p className="portal-text-meta mt-0.5 text-text-secondary">
              {stripHtmlToPlainText(p.beschreibung)}
            </p>
          ) : null}
          {p.meta ? (
            <p className="portal-text-meta mt-0.5 text-text-tertiary">{p.meta}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function formatEuro(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export function PortalDetailLeistungenPreisListe({
  items,
  gesamtBrutto,
  gesamtLabel = "Gesamtpreis Brutto inkl. MwSt.",
  hidePreise = false,
}: {
  items: Array<{
    id: string;
    title: string;
    beschreibung?: string;
    preisBrutto: number;
    preisBruttoAlt?: number;
    aenderungBadge?: "neu" | "geaendert" | "entfernt";
    entfernt?: boolean;
  }>;
  gesamtBrutto?: number;
  gesamtLabel?: string;
  hidePreise?: boolean;
}) {
  if (!items.length) return null;
  const showGesamt =
    !hidePreise && typeof gesamtBrutto === "number" && gesamtBrutto > 0;

  return (
    <div className="portal-text-body overflow-hidden rounded-xl border border-border-light bg-muted/20">
      <ul>
        {items.map((p, i) => {
          const isEntfernt = Boolean(p.entfernt || p.aenderungBadge === "entfernt");
          const geaendert = p.aenderungBadge === "geaendert";
          const preisLabel =
            p.preisBrutto > 0 ? formatEuro(p.preisBrutto) : "Preis folgt";
          const ampel = resolvePortalLeistungStatusAmpel({
            aenderungBadge: p.aenderungBadge,
            entfernt: isEntfernt,
          });

          return (
            <li
              key={p.id}
              className={cn(
                "flex items-start gap-4 px-3 py-3 sm:gap-6",
                !hidePreise && "justify-between",
                i < items.length - 1 && "border-b border-border-light",
                isEntfernt && "bg-red-50/70",
                geaendert && "bg-amber-50/60"
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  <LeistungStatusDot status={ampel} className="mt-1.5" />
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "portal-text-card-title font-semibold",
                        isEntfernt && "line-through text-text-secondary"
                      )}
                    >
                      {stripHtmlToPlainText(p.title) || p.title}
                    </p>
                    {p.beschreibung ? (
                      <p className="portal-text-meta mt-0.5 text-text-secondary">
                        {stripHtmlToPlainText(p.beschreibung)}
                      </p>
                    ) : null}
                    {isEntfernt ? (
                      <p className="portal-text-meta mt-1 text-red-700">
                        Diese Leistung entfällt — bitte bestätigen.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
              {!hidePreise ? (
                <div className="shrink-0 pt-0.5 text-right">
                  <p
                    className={cn(
                      "portal-text-body font-semibold tabular-nums",
                      preisLabel === "Preis folgt"
                        ? "portal-text-meta font-normal italic text-text-tertiary"
                        : isEntfernt
                          ? "text-text-tertiary line-through"
                          : geaendert
                            ? "text-amber-800"
                            : "text-text-primary"
                    )}
                  >
                    {preisLabel}
                  </p>
                  {p.preisBruttoAlt != null &&
                  p.preisBruttoAlt > 0 &&
                  p.preisBrutto > 0 &&
                  Math.abs(p.preisBruttoAlt - p.preisBrutto) > 0.009 ? (
                    <p className="portal-text-meta mt-0.5 tabular-nums text-text-tertiary line-through">
                      vorher {formatEuro(p.preisBruttoAlt)}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {showGesamt ? (
        <div className="flex items-center justify-between gap-4 border-t border-border-default bg-muted/40 px-3 py-3 sm:gap-6">
          <p className="portal-text-card-title">{gesamtLabel}</p>
          <p className="portal-text-card-title tabular-nums">
            {formatEuro(gesamtBrutto)}
          </p>
        </div>
      ) : null}
    </div>
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
      <div
        className={cn(
          "portal-detail-layout space-y-5",
          footer ? "pb-4 max-lg:pb-2 lg:pb-2" : "pb-2"
        )}
      >
        {children}
      </div>
      {footer ? (
        <>
          {/* Platzhalter: fixed Action-Bar darf Inhalt nicht verdecken */}
          <div
            className="pointer-events-none max-lg:h-[var(--portal-detail-actions-h,6rem)] lg:hidden"
            aria-hidden
          />
          <div className="portal-detail-sticky-actions z-40 border-t border-[var(--p2-line)] bg-[var(--p2-panel)]/95 px-4 py-3 shadow-[0_-4px_12px_rgba(16,25,20,0.08)] backdrop-blur-sm max-lg:fixed max-lg:inset-x-0 max-lg:bottom-[var(--portal-mobile-nav-h)] lg:sticky lg:bottom-0 lg:mt-5">
            {footer}
          </div>
        </>
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
  disabledHint,
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
  /** Hinweis unter den Buttons, wenn Primary disabled (z. B. fehlende Checkbox). */
  disabledHint?: string | null;
}) {
  return (
    <div className="w-full space-y-2">
      <div className="portal-action-row">
        {secondaryLabel ? (
          <button
            type="button"
            disabled={secondaryDisabled || primaryLoading}
            onClick={onSecondary}
            className="portal-action-btn portal-action-btn--secondary"
          >
            {secondaryLabel}
          </button>
        ) : null}
        <button
          type={primaryType}
          form={primaryForm}
          disabled={primaryDisabled || primaryLoading}
          onClick={primaryType === "button" ? onPrimary : undefined}
          className="portal-action-btn portal-action-btn--primary"
        >
          {primaryLoading ? "Wird gesendet…" : primaryLabel}
        </button>
      </div>
      {primaryDisabled && disabledHint ? (
        <p className="portal-text-label normal-case tracking-normal text-center text-text-tertiary">
          {disabledHint}
        </p>
      ) : null}
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

export function PortalAnsprechpartnerCard({
  rolleLabel,
  name,
  telefon,
  telefonHref,
  intro,
}: {
  rolleLabel: string;
  name: string;
  telefon: string;
  telefonHref: string;
  intro: string;
}) {
  return (
    <section className="space-y-2.5 border-t border-border-light pt-5">
      <h4 className="portal-text-section">Ansprechpartner</h4>
      <div className="portal-text-body rounded-xl border border-border-light bg-gradient-to-br from-emerald-50/80 to-surface-card px-4 py-4">
        <p className="portal-text-meta font-semibold uppercase tracking-wide text-accent">
          {rolleLabel}
        </p>
        <p className="portal-text-title mt-2">{name}</p>
        {intro.trim() ? (
          <p className="portal-text-body mt-3 text-text-secondary">{intro}</p>
        ) : null}
        <a
          href={telefonHref}
          className="portal-text-body mt-3 inline-flex font-semibold text-accent underline-offset-2 hover:underline"
        >
          {telefon}
        </a>
      </div>
    </section>
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
              "portal-text-body font-medium text-text-primary",
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

/* Shared Detail-Kit Re-Exports */
export { PortalDetailCover } from "@/components/shared/PortalDetailCover";
export { PortalDetailTabs } from "@/components/shared/PortalDetailTabs";
export {
  PortalActionMenu,
  PortalActionMenuList,
  buildAushangActionItems,
  buildAushangNestedItem,
} from "@/components/shared/PortalActionMenu";
export type { PortalActionMenuItem } from "@/components/shared/PortalActionMenu";
export type { PortalDetailTab } from "@/components/shared/PortalDetailTabs";
export { PortalDetailCard } from "@/components/shared/PortalDetailCard";
