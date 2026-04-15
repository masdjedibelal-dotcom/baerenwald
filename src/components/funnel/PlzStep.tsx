"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { getPlzStatus } from "@/lib/funnel/plz";

const ZEITRAUM_OPTIONS: {
  value: string;
  label: string;
  hint: string;
}[] = [
  {
    value: "sofort",
    label: "So schnell wie möglich",
    hint: "Notfall oder dringend",
  },
  {
    value: "heute",
    label: "Diese Woche",
    hint: "Innerhalb der nächsten 7 Tage",
  },
  {
    value: "woche",
    label: "Innerhalb 4 Wochen",
    hint: "Kein Stress aber bald",
  },
  {
    value: "flexibel",
    label: "Ich bin flexibel",
    hint: "Kein fixer Zeitplan",
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
          className="w-full max-w-[180px] rounded-xl border border-border-default p-3 text-[15px] text-text-primary outline-none transition-colors focus:border-funnel-accent"
        />

        {plzStatus === "ungueltig" && (
          <p className="plz-hint plz-hint--error">
            Bitte gib eine gültige 5-stellige PLZ ein.
          </p>
        )}

        {plzStatus === "erlaubt" && (
          <p className="plz-hint plz-hint--ok">✓ Wir sind in deiner Region aktiv</p>
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

      {/* Zeitraum nur anzeigen wenn nicht ausserhalb */}
      {!isAusserhalb && (
        <div className="flex flex-col gap-2.5">
          {ZEITRAUM_OPTIONS.map((c) => {
            const active = zeitraum === c.value;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => onZeitraumChange(c.value)}
                className={cn(
                  "rounded-xl border border-border-default bg-surface-card px-4 py-3 text-left transition-colors",
                  active ? "funnel-tile-selected" : "funnel-tile-hover"
                )}
              >
                <span className="block text-sm font-medium text-text-primary">
                  {c.label}
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-text-tertiary">
                  {c.hint}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
