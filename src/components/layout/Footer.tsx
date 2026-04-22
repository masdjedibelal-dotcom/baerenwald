import { cn } from "@/lib/utils";

export interface FunnelFooterProps {
  onBack?: () => void;
  onNext?: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  showBack?: boolean;
  hideNext?: boolean;
  accentColor?: string;
  className?: string;
}

export function Footer({
  onBack,
  onNext,
  nextDisabled = false,
  nextLabel = "Weiter",
  showBack = true,
  hideNext = false,
  accentColor = "#1B4332",
  className,
}: FunnelFooterProps) {
  return (
    <footer
      className={cn(
        "sticky bottom-0 z-50 flex min-h-[60px] w-full items-center justify-between gap-3 border-t border-border-default bg-surface-card px-[18px] py-3",
        className
      )}
      style={{
        paddingBottom: "max(12px, env(safe-area-inset-bottom))",
      }}
    >
      <p className="max-w-[48%] text-left text-[11px] leading-snug text-[#999]">
        Kein Auftragszwang · Kostenlos
      </p>
      <div className="flex shrink-0 items-center gap-2">
        {showBack && onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="rounded-[var(--r-pill)] border border-border-default bg-surface-card px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:border-border-strong"
          >
            Zurück
          </button>
        ) : null}
        {!hideNext && onNext ? (
          <button
            type="button"
            disabled={nextDisabled}
            onClick={onNext}
            className={cn(
              "rounded-[var(--r-pill)] px-5 py-2.5 text-sm font-medium text-white transition-opacity",
              nextDisabled && "cursor-not-allowed opacity-40"
            )}
            style={{ backgroundColor: nextDisabled ? "#999" : accentColor }}
          >
            {nextLabel}
          </button>
        ) : null}
      </div>
    </footer>
  );
}
