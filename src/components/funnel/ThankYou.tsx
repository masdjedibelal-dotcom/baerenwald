"use client";

import { cn } from "@/lib/utils";

export interface ThankYouProps {
  variant?: "termin" | "anfrage" | "beratung";
  dateLabel?: string;
  timeLabel?: string;
  typ?: string;
  dauer?: string;
  /** Optional: z. B. Gewerbe/Gastro B2B-Danke-Text */
  beratungHeadline?: string;
  beratungSubline?: string;
  className?: string;
}

export function ThankYou({
  variant = "termin",
  dateLabel = "",
  timeLabel = "",
  typ = "Vor-Ort-Termin",
  dauer = "30 Min.",
  beratungHeadline,
  beratungSubline,
  className,
}: ThankYouProps) {
  const isTermin = variant === "termin";
  const isBeratung = variant === "beratung";

  const showWunschterminSummary =
    isTermin && Boolean(dateLabel?.trim()) && Boolean(timeLabel?.trim());

  const followUpSubline =
    "Wir prüfen die Verfügbarkeit und melden uns innerhalb von 24h per Telefon oder E-Mail zur Terminbestätigung.";

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
        {isBeratung
          ? beratungHeadline ?? "Wir melden uns persönlich bei dir."
          : "Anfrage eingegangen!"}
      </h2>
      <p className="mt-2 max-w-sm text-sm text-text-secondary">
        {isBeratung
          ? beratungSubline ??
            "Deine Anfrage ist bei uns eingegangen. Ein Kollege meldet sich bei dir — in der Regel innerhalb von 24 Stunden."
          : followUpSubline}
      </p>

      {showWunschterminSummary ? (
        <div className="mt-6 w-full text-left">
          <p className="mb-2 text-sm font-semibold text-text-primary">
            Dein Wunschtermin
          </p>
          <div className="rounded-xl bg-muted p-4">
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
          <p className="mt-4 max-w-md text-center text-xs leading-relaxed text-text-tertiary">
            Sobald wir die Verfügbarkeit bestätigt haben, kannst du den Termin
            in deinen Kalender eintragen.
          </p>
        </div>
      ) : null}

      {!isBeratung ? (
        <p className="mt-6 max-w-md text-center text-xs leading-relaxed text-text-tertiary">
          Ein Ansprechpartner — wir koordinieren alle Handwerker
        </p>
      ) : null}
    </div>
  );
}
