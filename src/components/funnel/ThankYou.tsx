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
        "fade-in mx-auto max-w-[540px] space-y-8 px-[18px] py-8 text-center",
        className
      )}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="flex size-[52px] items-center justify-center rounded-full bg-[#f0f0f0] text-funnel-accent">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="M20 6L9 17l-5-5"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-text-primary">
          {isTermin ? "Termin bestätigt!" : "Anfrage eingegangen!"}
        </h2>
        <p className="max-w-sm text-[13px] leading-relaxed text-[#666]">
          {isTermin
            ? "Wir freuen uns auf den Termin bei dir."
            : "Wir melden uns schnellstmöglich bei dir."}
        </p>
      </div>

      {isTermin && dateLabel && timeLabel ? (
        <div className="rounded-[var(--r)] border border-[#e8e8e8] bg-[#fafafa] px-4 py-3 text-left">
          {[
            ["Datum", dateLabel],
            ["Uhrzeit", timeLabel],
            ["Typ", typ],
            ["Dauer", dauer],
          ].map(([k, v], i, arr) => (
            <div
              key={k}
              className={cn(
                "flex justify-between gap-4 py-2 text-[13px]",
                i < arr.length - 1 && "border-b border-[#e8e8e8]"
              )}
            >
              <span className="text-[#666]">{k}</span>
              <span className="font-medium text-text-primary">{v}</span>
            </div>
          ))}
        </div>
      ) : null}

      {isTermin ? (
        <div className="flex flex-wrap justify-center gap-2">
          {["+ Google Kalender", "+ Apple Kalender", "+ Outlook"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={openBlank}
              className="rounded-[999px] border border-[#e8e8e8] bg-transparent px-3 py-2 text-[11px] text-[#666]"
            >
              {t}
            </button>
          ))}
        </div>
      ) : null}

      <p className="text-xs leading-relaxed text-[#999]">
        Ein Ansprechpartner koordiniert alle Gewerke — du brauchst dich um
        nichts zu kümmern.
      </p>
    </div>
  );
}
