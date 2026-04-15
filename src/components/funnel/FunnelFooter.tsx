"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface FunnelFooterProps {
  onNext?: () => void;
  onBack?: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  /** Zusatzzeile unter der Button-Zeile (z. B. Hinweis bei Beratungs-Flow) */
  belowActions?: ReactNode;
  className?: string;
}

export function FunnelFooter({
  onNext,
  onBack,
  nextDisabled = false,
  nextLabel = "Weiter →",
  belowActions,
  className,
}: FunnelFooterProps) {
  return (
    <footer
      className={cn("sticky bottom-0 z-50 funnel-footer", className)}
    >
      <div className="mx-auto max-w-xl funnel-footer-inner">
        <div className="funnel-footer-actions">
          <div className="min-w-0">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="funnel-back-btn"
              >
                ← Zurück
              </button>
            ) : (
              <span className="funnel-back-spacer" aria-hidden />
            )}
          </div>
          <div className="shrink-0">
            {onNext ? (
              <button
                type="button"
                disabled={nextDisabled}
                onClick={onNext}
                className="funnel-footer-next"
              >
                {nextLabel}
              </button>
            ) : null}
          </div>
        </div>
        {belowActions ? (
          <div className="mt-1.5 text-center">{belowActions}</div>
        ) : null}
        <div className="funnel-footer-legal">
          <span>* Alle Preisangaben unverbindlich</span>
          <span className="funnel-footer-dot" aria-hidden>·</span>
          <a href="/impressum" target="_blank" rel="noopener noreferrer">
            Impressum
          </a>
          <span className="funnel-footer-dot" aria-hidden>·</span>
          <a href="/datenschutz" target="_blank" rel="noopener noreferrer">
            Datenschutz
          </a>
        </div>
      </div>
    </footer>
  );
}
