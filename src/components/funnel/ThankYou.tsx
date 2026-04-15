"use client";

import { cn } from "@/lib/utils";

const TIMELINE_STEPS = [
  {
    title: "Anfrage eingegangen",
    sub: "Wir haben deine Anfrage und alle Angaben erhalten.",
  },
  {
    title: "Verfügbarkeit wird geprüft",
    sub: "Wir melden uns innerhalb von 24h zur Terminbestätigung per Telefon oder E-Mail.",
  },
  {
    title: "Vor-Ort-Termin",
    sub: "Wir schauen uns alles an und erstellen ein genaues Festpreisangebot.",
  },
  {
    title: "Auftrag & Umsetzung",
    sub: "Nach deiner Zusage koordinieren wir alle Handwerker — du lehnst dich zurück.",
  },
] as const;

function TimelineCheck() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
      <path
        d="M2 5l2.5 2.5 3.5-4"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export interface ThankYouProps {
  variant?: "termin" | "anfrage" | "beratung";
  dateLabel?: string;
  timeLabel?: string;
  typ?: string;
  dauer?: string;
  /** Optional: z. B. Gewerbe/Gastro B2B-Danke-Text */
  beratungHeadline?: string;
  beratungSubline?: string;
  /** Ablauf-Timeline unter dem Text (nur bei variant „termin“ / „anfrage“). */
  showTimeline?: boolean;
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
  showTimeline = true,
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

      {!isBeratung && showTimeline !== false ? (
        <div className="submit-timeline w-full text-left">
          {TIMELINE_STEPS.map((step, i) => (
            <div
              key={step.title}
              className={`submit-timeline-step${i === 0 ? " active" : ""}`}
            >
              <div className="submit-timeline-left">
                <div className="submit-timeline-dot">
                  {i === 0 ? <TimelineCheck /> : <span>{i + 1}</span>}
                </div>
                {i < TIMELINE_STEPS.length - 1 ? (
                  <div className="submit-timeline-line" />
                ) : null}
              </div>
              <div className="submit-timeline-content">
                <div className="submit-timeline-title">{step.title}</div>
                <div className="submit-timeline-sub">{step.sub}</div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
