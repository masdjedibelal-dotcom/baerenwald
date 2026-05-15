"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { getPlzStatus } from "@/lib/funnel/plz";
import {
  getZeitraumFragen,
  getZeitraumOptions,
  needsZeitraumSelection,
} from "@/lib/funnel/config";
import { BwIcon } from "@/components/ui/BwIcon";
import type { Situation } from "@/lib/funnel/types";

export interface PlzStepProps {
  situation: Situation | null;
  plz: string;
  zeitraum: string;
  onPlzChange: (plz: string) => void;
  onZeitraumChange: (value: string) => void;
  onAusserhalbAnfrage: () => void;
  className?: string;
}

export function PlzStep({
  situation,
  plz,
  zeitraum,
  onPlzChange,
  onZeitraumChange,
  onAusserhalbAnfrage,
  className,
}: PlzStepProps) {
  const zeitraumOptions = getZeitraumOptions(situation);
  const zeitraumFrage = getZeitraumFragen(situation);
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
            Perfekt — wir sind in deiner Nähe
          </p>
        )}

        {isAusserhalb && (
          <div className="plz-ausserhalb-box">
            <div className="plz-ausserhalb-icon" aria-hidden>
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                className="plz-ausserhalb-pin"
              >
                <path
                  d="M12 21s7-4.35 7-10a7 7 0 10-14 0c0 5.65 7 10 7 10z"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx="12"
                  cy="11"
                  r="2.25"
                  stroke="currentColor"
                  strokeWidth="1.75"
                />
              </svg>
            </div>
            <div className="plz-ausserhalb-text">
              <p className="plz-ausserhalb-head">
                Aktuell sind wir hauptsächlich in München und einem Umkreis
                von ca. 70 km tätig.
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

      {!isAusserhalb &&
        needsZeitraumSelection(situation) &&
        zeitraumOptions.length > 0 && (
        <div className="funnel-step-tiles-card flex flex-col gap-2.5">
          <div>
            <h3 className="text-base font-semibold leading-snug text-text-primary">
              {zeitraumFrage.question}
            </h3>
            {zeitraumFrage.hint ? (
              <p className="mt-1 text-sm leading-snug text-text-secondary">
                {zeitraumFrage.hint}
              </p>
            ) : null}
          </div>
          {zeitraumOptions.map((c) => {
            const active = zeitraum === c.value;
            const hasVisual = Boolean(c.icon || c.emoji);
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => onZeitraumChange(c.value)}
                className={cn(
                  "funnel-tile text-left",
                  !hasVisual && "funnel-tile--text-only",
                  active && "selected"
                )}
              >
                <div
                  className={cn(
                    "pr-8",
                    !hasVisual &&
                      "flex min-h-[5.25rem] flex-col justify-center gap-0.5 py-4"
                  )}
                >
                  {c.icon ? (
                    <span className="funnel-tile-icon-wrap" aria-hidden>
                      <BwIcon name={c.icon} />
                    </span>
                  ) : c.emoji ? (
                    <span className="funnel-tile-emoji" aria-hidden>
                      {c.emoji}
                    </span>
                  ) : null}
                  <span className="funnel-tile-label">{c.label}</span>
                  <span className="funnel-tile-hint">{c.hint}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
