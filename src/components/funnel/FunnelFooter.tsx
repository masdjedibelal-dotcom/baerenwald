"use client";

import { cn } from "@/lib/utils";

export interface FunnelFooterProps {
  onNext?: () => void;
  onBack?: () => void;
  nextDisabled?: boolean;
  showBack?: boolean;
  nextLabel?: string;
  className?: string;
}

export function FunnelFooter({
  onNext,
  onBack,
  nextDisabled = false,
  showBack = true,
  nextLabel = "Weiter →",
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
      <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
        <p className="text-xs text-text-tertiary">
          Kein Auftragszwang · Kostenlos
        </p>
        <div className="flex shrink-0 items-center gap-3">
          {showBack && onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
            >
              Zurück
            </button>
          ) : null}
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
    </footer>
  );
}
