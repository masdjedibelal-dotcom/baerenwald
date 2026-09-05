"use client";

import { ChevronRight } from "lucide-react";

import { MockIcon } from "@/components/shared/MockIcon";
import { cn } from "@/lib/utils";

export type PortalFocusProgress = {
  labels: string[];
  /** 0-basiert, aktiver Schritt */
  activeStep: number;
};

export type PortalFocusAmount = {
  label: string;
  value: string;
};

export type PortalFocusButton = {
  label: string;
  variant: "primary" | "secondary";
  onClick?: () => void;
};

export type PortalDashboardFocus = {
  kicker: string;
  /** Sand = Entscheidung, Grün = Info/Prüfung */
  kickerTone?: "sand" | "green";
  title: string;
  subtitle?: string | null;
  progress?: PortalFocusProgress | null;
  amount?: PortalFocusAmount | null;
  note?: string | null;
  noteTone?: "warn" | "default";
  buttons?: PortalFocusButton[];
  onOpen?: () => void;
};

/**
 * Fokus-Karte — Deep Green (eine Aktion oben, optional Betrag/Fortschritt).
 */
export function PortalDashboardFocusCard({
  focus,
  className,
}: {
  focus: PortalDashboardFocus;
  className?: string;
}) {
  const tone = focus.kickerTone ?? "sand";
  const dot =
    tone === "green"
      ? "var(--org-primary, var(--p2-primary, #2e7d52))"
      : "var(--p2-sand, #e8b04b)";

  return (
    <article className={cn("portal-dash-focus", className)}>
      <div className="portal-dash-focus-head">
        <div className="portal-dash-focus-kicker">
          <span
            className="portal-dash-focus-dot"
            style={{ background: dot }}
            aria-hidden
          />
          <span>{focus.kicker}</span>
        </div>
        {focus.onOpen ? (
          <button
            type="button"
            className="portal-dash-focus-open"
            onClick={focus.onOpen}
          >
            Öffnen
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>

      <h2 className="portal-dash-focus-title">{focus.title}</h2>
      {focus.subtitle ? (
        <p className="portal-dash-focus-sub">{focus.subtitle}</p>
      ) : null}

      {focus.progress ? (
        <div className="portal-dash-focus-progress">
          <div className="portal-dash-focus-bars" aria-hidden>
            {focus.progress.labels.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "portal-dash-focus-bar",
                  i <= focus.progress!.activeStep &&
                    "portal-dash-focus-bar--on"
                )}
              />
            ))}
          </div>
          <div className="portal-dash-focus-bar-labels">
            {focus.progress.labels.map((label, i) => (
              <span
                key={label}
                className={cn(
                  i <= focus.progress!.activeStep &&
                    "portal-dash-focus-bar-label--on"
                )}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {focus.amount ? (
        <div className="portal-dash-focus-amount">
          <span className="portal-dash-focus-amount-label">
            {focus.amount.label}
          </span>
          <span className="portal-dash-focus-amount-value">
            {focus.amount.value}
          </span>
        </div>
      ) : null}

      {focus.note ? (
        <p
          className={cn(
            "portal-dash-focus-note",
            focus.noteTone === "warn" && "portal-dash-focus-note--warn"
          )}
        >
          {focus.note}
        </p>
      ) : null}

      {focus.buttons && focus.buttons.length > 0 ? (
        <div className="portal-dash-focus-actions">
          {focus.buttons.map((btn) => (
            <button
              key={btn.label}
              type="button"
              className={cn(
                "portal-dash-focus-btn",
                btn.variant === "primary"
                  ? "portal-dash-focus-btn--primary"
                  : "portal-dash-focus-btn--secondary"
              )}
              onClick={btn.onClick ?? focus.onOpen}
            >
              {btn.label}
            </button>
          ))}
        </div>
      ) : null}
    </article>
  );
}

/** HV Service-Versprechen — ersetzt OrganisationHvSlaSection (feste Design-Copy). */
export function PortalServiceVersprechenStrip({
  className,
}: {
  className?: string;
}) {
  return (
    <section
      className={cn("portal-dash-sla", className)}
      aria-label="Bärenwald Service-Versprechen"
    >
      <p className="portal-dash-sla-kicker">Bärenwald Service-Versprechen</p>
      <p className="portal-dash-sla-line">
        Keine Meldung bleibt liegen — wir kümmern uns.
      </p>
      <div className="portal-dash-sla-metrics">
        <div className="portal-dash-sla-metric">
          <MockIcon n="zap" ctx="sidebar" size={14} />
          <span className="portal-dash-sla-value">4 Std.</span>
          <span className="portal-dash-sla-label">
            bis zur ersten Bearbeitung
          </span>
        </div>
        <div className="portal-dash-sla-metric">
          <MockIcon n="check" ctx="sidebar" size={14} />
          <span className="portal-dash-sla-value">6 Tage</span>
          <span className="portal-dash-sla-label">bis zur Erledigung</span>
        </div>
      </div>
    </section>
  );
}
