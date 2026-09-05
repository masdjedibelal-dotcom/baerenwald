"use client";

import { Info } from "lucide-react";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import {
  LeistungStatusDot,
  resolvePortalLeistungStatusAmpel,
} from "@/components/shared/LeistungStatusDot";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import { PortalSheetConfirm } from "@/components/shared/PortalSheetConfirm";
import { useIsPortalMobile } from "@/lib/portal2/use-is-portal-mobile";
import { cn } from "@/lib/utils";
import { stripHtmlToPlainText } from "@/lib/portal/portal-display";

/** Footer aus `PortalDetailLayout` — Desktop: automatisch in `PortalDetailHead`. */
const PortalDetailLayoutFooterContext = createContext<ReactNode>(null);

export function usePortalDetailLayoutFooter(): ReactNode {
  return useContext(PortalDetailLayoutFooterContext);
}

/**
 * Einheitliches Bottom-Confirm — gleiches Pattern wie Dirty „Verwerfen / Weiter bearbeiten“.
 */
export function PortalConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmVariant = "primary",
  cancelLabel = "Abbrechen",
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: "primary" | "danger";
  /** Cancel-Label — bei Dirty-Close oft „Weiter bearbeiten“. */
  cancelLabel?: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <PortalSheetConfirm
      open={open}
      placement="standalone"
      title={title}
      description={description}
      cancelLabel={cancelLabel}
      confirmLabel={confirmLabel}
      confirmVariant={confirmVariant}
      loading={loading}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
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
  /** Deep Green: Titel bereits im Cover — hier nur Meta + Actions */
  hideTitle,
  timeline,
}: {
  title: string;
  metaLine?: string;
  statusLabel?: string;
  statusPillClass?: string;
  statusPillStyle?: { color: string; backgroundColor: string };
  subtitle?: string;
  titleBadges?: React.ReactNode;
  actions?: React.ReactNode;
  hideTitle?: boolean;
  timeline?: React.ReactNode;
}) {
  const layoutFooter = usePortalDetailLayoutFooter();
  const resolvedActions = actions ?? layoutFooter;
  const layoutFooterOnly = !actions && Boolean(layoutFooter);
  const showStatusRow =
    !hideTitle &&
    (Boolean(statusLabel?.trim()) || Boolean(subtitle));

  return (
    <header className="portal-detail-head">
      <div className="portal-detail-head-main">
        {!hideTitle ? (
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="portal-detail-head-title">{title}</h3>
            {titleBadges}
          </div>
        ) : titleBadges ? (
          <div className="flex flex-wrap items-center gap-2">{titleBadges}</div>
        ) : null}
        {metaLine ? (
          <p className="portal-detail-head-meta">{metaLine}</p>
        ) : null}
        {showStatusRow ? (
          <div className="flex flex-wrap items-center gap-2">
            {statusLabel?.trim() ? (
              <span
                className={cn(
                  "portal-status-word",
                  !statusPillStyle && statusPillClass
                )}
                style={
                  statusPillStyle
                    ? { color: statusPillStyle.color }
                    : undefined
                }
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
        {timeline ? (
          <div className="portal-detail-head-timeline">{timeline}</div>
        ) : null}
      </div>
      {resolvedActions ? (
        <div
          className={cn(
            "portal-detail-head-actions",
            layoutFooterOnly && "hidden lg:flex"
          )}
        >
          {resolvedActions}
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
      <div className="portal-detail-infobox portal-detail-infobox--warn">
        <Info className="mt-0.5 h-[17px] w-[17px] shrink-0" aria-hidden />
        <div className="min-w-0">{children}</div>
      </div>
    );
  }
  return (
    <div className="portal-detail-infobox">
      <Info
        className="mt-0.5 h-[17px] w-[17px] shrink-0 text-[var(--org-primary,var(--p2-primary,#2e7d52))]"
        aria-hidden
      />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function PortalDetailSection({
  title,
  children,
  className,
}: {
  /** Leer/undefined = kein Überschrift (wenn Tab den Titel schon trägt). */
  title?: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-2.5", className)}>
      {title?.trim() ? (
        <h4 className="portal-text-section">{title.trim()}</h4>
      ) : null}
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
    <dl className="portal-detail-kv">
      {visible.map((row) => (
        <div key={row.label} className="portal-detail-kv-row">
          <dt className="portal-detail-kv-label">{row.label}</dt>
          <dd className="portal-detail-kv-value">{row.value}</dd>
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
    <ul className="portal-text-body divide-y divide-border-light">
      {items.map((p) => (
        <li key={p.id} className="px-0 py-3">
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
    gewerk?: string;
    menge?: number;
    einheit?: string;
    mengeLabel?: string;
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
    !hidePreise && typeof gesamtBrutto === "number" && gesamtBrutto >= 0;

  return (
    <div className="portal-text-body">
      <ul className="divide-y divide-border-light">
        {items.map((p) => {
          const isEntfernt = Boolean(p.entfernt || p.aenderungBadge === "entfernt");
          const geaendert = p.aenderungBadge === "geaendert";
          const preisLabel =
            typeof p.preisBrutto === "number" && p.preisBrutto >= 0
              ? formatEuro(p.preisBrutto)
              : "Preis folgt";
          const ampel = resolvePortalLeistungStatusAmpel({
            aenderungBadge: p.aenderungBadge,
            entfernt: isEntfernt,
          });
          const mengeLine =
            p.mengeLabel?.trim() ||
            [p.menge, p.einheit].filter(Boolean).join(" ").trim() ||
            "";
          const subline = [p.gewerk?.trim(), mengeLine].filter(Boolean).join(" · ");

          return (
            <li
              key={p.id}
              className={cn(
                "flex items-start gap-4 px-0 py-3 sm:gap-6",
                !hidePreise && "justify-between",
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
                    {subline ? (
                      <p className="portal-text-meta mt-0.5 text-text-secondary">
                        {subline}
                      </p>
                    ) : null}
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
        <div className="flex items-center justify-between gap-4 border-t border-border-default px-0 py-3 sm:gap-6">
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
  const isMobile = useIsPortalMobile();
  const hasCta = Boolean(footer);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const root = document.body;
    if (!isMobile || !hasCta) {
      root.classList.remove("has-portal-detail-cta");
      return;
    }
    root.classList.add("has-portal-detail-cta");
    return () => {
      root.classList.remove("has-portal-detail-cta");
    };
  }, [isMobile, hasCta]);

  const mobileBar =
    mounted && isMobile && footer
      ? createPortal(
          <div className="portal-detail-mobile-cta" role="toolbar" aria-label="Aktionen">
            <div className="portal-detail-mobile-cta__inner">{footer}</div>
          </div>,
          document.body
        )
      : null;

  return (
    <PortalDetailLayoutFooterContext.Provider value={footer ?? null}>
      <div className="flex flex-col">
        <div className="portal-detail-layout space-y-5 pb-2">{children}</div>
        {mobileBar}
      </div>
    </PortalDetailLayoutFooterContext.Provider>
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
  tertiaryLabel,
  onTertiary,
  tertiaryDisabled,
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
  /** Dritter Button links (z. B. „Ablehnen“ neben Secondary + Primary). */
  tertiaryLabel?: string;
  onTertiary?: () => void;
  tertiaryDisabled?: boolean;
  /** Hinweis unter den Buttons, wenn Primary disabled (z. B. fehlende Checkbox). */
  disabledHint?: string | null;
}) {
  return (
    <div className="w-full space-y-2 lg:w-auto">
      <div className="portal-action-row">
        {tertiaryLabel ? (
          <button
            type="button"
            disabled={tertiaryDisabled || primaryLoading}
            onClick={onTertiary}
            className="portal-action-btn portal-action-btn--ghost"
          >
            {tertiaryLabel}
          </button>
        ) : null}
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
      {disabledHint && (primaryDisabled || secondaryDisabled) ? (
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
      <div className="portal-text-body px-0 py-1">
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
    <ul className="divide-y divide-border-light">
      {items.map((m) => (
        <li
          key={m.id}
          className={cn(
            "portal-text-body flex items-start gap-3 px-0 py-3",
            m.erledigt ? "text-text-primary" : "text-text-secondary"
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
