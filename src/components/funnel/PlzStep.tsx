"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { getPlzStatus } from "@/lib/funnel/plz";

const ZEITRAUM_OPTIONS: {
  value: string;
  label: string;
  hint: string;
  emoji: string;
}[] = [
  {
    value: "sofort",
    label: "So schnell wie möglich",
    hint: "Wir priorisieren dein Projekt",
    emoji: "⚡",
  },
  {
    value: "heute",
    label: "Diese Woche",
    hint: "Kurzfristige Umsetzung",
    emoji: "📅",
  },
  {
    value: "woche",
    label: "Innerhalb 4 Wochen",
    hint: "Normale Planung",
    emoji: "🗓️",
  },
  {
    value: "flexibel",
    label: "Ich bin flexibel",
    hint: "Mehr Spielraum bei der Planung",
    emoji: "✅",
  },
];

export interface PlzStepProps {
  plz: string;
  zeitraum: string;
  onPlzChange: (plz: string) => void;
  onZeitraumChange: (value: string) => void;
  onAusserhalbAnfrage: () => void;
  className?: string;
}

export function PlzStep({
  plz,
  zeitraum,
  onPlzChange,
  onZeitraumChange,
  onAusserhalbAnfrage,
  className,
}: PlzStepProps) {
  const [plzStatus, setPlzStatus] = useState<
    "idle" | "erlaubt" | "ausserhalb" | "ungueltig"
  >(() => {
    if (plz.length === 5) return getPlzStatus(plz);
    return "idle";
  });

  const handlePlzChange = (raw: string) => {
    const value = raw.replace(/\D/g, "").slice(0, 5);
    onPlzChange(value);
    if (value.length === 5) {
      setPlzStatus(getPlzStatus(value));
    } else {
      setPlzStatus("idle");
    }
  };

  const isAusserhalb = plzStatus === "ausserhalb";

  return (
    <div className={cn("space-y-5", className)}>
      <div>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          placeholder="PLZ"
          value={plz}
          onChange={(e) => handlePlzChange(e.target.value)}
          className={cn(
            "funnel-input max-w-[180px]",
            plzStatus === "ungueltig" && "input-error",
            plzStatus === "erlaubt" && "input-valid"
          )}
        />

        {plzStatus === "ungueltig" && (
          <p className="plz-hint plz-hint--error">
            Bitte gib eine gültige 5-stellige PLZ ein.
          </p>
        )}

        {plzStatus === "erlaubt" && (
          <p className="plz-hint plz-hint--ok">
            ✓ Perfekt — wir sind in deiner Nähe
          </p>
        )}

        {isAusserhalb && (
          <div className="plz-ausserhalb-box">
            <div className="plz-ausserhalb-icon">📍</div>
            <div className="plz-ausserhalb-text">
              <p className="plz-ausserhalb-head">
                Aktuell sind wir hauptsächlich in München und einem Umkreis
                von ca. 50 km tätig.
              </p>
              <p className="plz-ausserhalb-sub">
                Deine Anfrage nehmen wir trotzdem gerne entgegen — wir schauen
                ob wir helfen können.
              </p>
            </div>
            <button
              type="button"
              className="plz-ausserhalb-btn"
              onClick={onAusserhalbAnfrage}
            >
              Trotzdem anfragen →
            </button>
          </div>
        )}
      </div>

      {!isAusserhalb && (
        <div className="funnel-step-tiles-card flex flex-col gap-2.5">
          <h3 className="text-base font-semibold leading-snug text-text-primary">
            Wann soll es losgehen?
          </h3>
          {ZEITRAUM_OPTIONS.map((c) => {
            const active = zeitraum === c.value;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => onZeitraumChange(c.value)}
                className={cn("funnel-tile", active && "selected")}
              >
                <span className="funnel-tile-emoji" aria-hidden>
                  {c.emoji}
                </span>
                <span className="funnel-tile-label">{c.label}</span>
                <span className="funnel-tile-hint">{c.hint}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
