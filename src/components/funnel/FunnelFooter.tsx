"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface FunnelFooterProps {
  onNext?: () => void;
  onBack?: () => void;
  nextDisabled?: boolean;
  showBack?: boolean;
  nextLabel?: string;
  /** Zusatzzeile unter der Button-Zeile (z. B. Hinweis bei Beratungs-Flow) */
  belowActions?: ReactNode;
  className?: string;
}

export function FunnelFooter({
  onNext,
  onBack,
  nextDisabled = false,
  showBack = true,
  nextLabel = "Weiter →",
  belowActions,
  className,
}: FunnelFooterProps) {
  return (
    <footer
      className={cn(
        "sticky bottom-0 z-50 border-t border-border-default bg-surface-card px-6 pt-3",
        "pb-[max(1.75rem,env(safe-area-inset-bottom))]",
        className
      )}
    >
      <div className="mx-auto max-w-xl">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            {showBack && onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
              >
                Zurück
              </button>
            ) : null}
          </div>
          <div className="shrink-0">
            {onNext ? (
              <button
                type="button"
                disabled={nextDisabled}
                onClick={onNext}
                className={cn(
                  "rounded-full bg-funnel-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity",
                  nextDisabled && "cursor-not-allowed opacity-40"
                )}
              >
                {nextLabel}
              </button>
            ) : null}
          </div>
        </div>
        {belowActions ? (
          <div className="mt-2 pb-0.5 text-center">{belowActions}</div>
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
