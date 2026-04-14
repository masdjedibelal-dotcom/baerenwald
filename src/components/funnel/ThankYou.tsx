"use client";

import { cn } from "@/lib/utils";

export interface ThankYouProps {
  variant?: "termin" | "anfrage";
  dateLabel?: string;
  timeLabel?: string;
  typ?: string;
  dauer?: string;
  className?: string;
}

export function ThankYou({
  variant = "termin",
  dateLabel = "",
  timeLabel = "",
  typ = "Vor-Ort-Termin",
  dauer = "30 Min.",
  className,
}: ThankYouProps) {
  const openBlank = () => {
    window.open("about:blank", "_blank", "noopener,noreferrer");
  };

  const isTermin = variant === "termin";

  return (
    <div
      className={cn(
        "mx-auto flex max-w-lg flex-col items-center px-6 py-12 text-center",
        className
      )}
    >
      <div
        className="flex size-[52px] items-center justify-center rounded-full bg-muted text-funnel-accent"
        aria-hidden
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M20 6L9 17l-5-5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h2 className="mt-4 text-xl font-semibold text-text-primary">
        {isTermin ? "Termin bestätigt!" : "Anfrage eingegangen!"}
      </h2>
      <p className="mt-2 max-w-sm text-sm text-text-secondary">
        {isTermin
          ? "Wir freuen uns auf den Termin bei dir."
          : "Wir melden uns schnellstmöglich bei dir."}
      </p>

      {isTermin && dateLabel && timeLabel ? (
        <div className="mt-6 w-full rounded-xl bg-muted p-4 text-left">
          {(
            [
              ["Datum", dateLabel],
              ["Uhrzeit", timeLabel],
              ["Typ", typ],
              ["Dauer", dauer],
            ] as const
          ).map(([k, v]) => (
            <div
              key={k}
              className="flex justify-between gap-4 border-b border-border-default py-2 text-sm last:border-b-0"
            >
              <span className="text-text-secondary">{k}</span>
              <span className="font-medium text-text-primary">{v}</span>
            </div>
          ))}
        </div>
      ) : null}

      {isTermin ? (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {(["Google Kalender", "Apple Kalender", "Outlook"] as const).map(
            (t) => (
              <button
                key={t}
                type="button"
                onClick={openBlank}
                className="rounded-full border border-border-default bg-surface-card px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-text-tertiary"
              >
                {t}
              </button>
            )
          )}
        </div>
      ) : null}

      <p className="mt-6 max-w-md text-center text-xs leading-relaxed text-text-tertiary">
        Ein Ansprechpartner koordiniert alle Handwerker — du brauchst dich um
        nichts zu kümmern.
      </p>
    </div>
  );
}
