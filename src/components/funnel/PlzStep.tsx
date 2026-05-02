"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { getPlzStatus } from "@/lib/funnel/plz";
import {
  getZeitraumFragen,
  getZeitraumOptions,
  needsZeitraumSelection,
} from "@/lib/funnel/config";
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
            ✓ Perfekt — wir sind in deiner Nähe
          </p>
        )}

        {isAusserhalb && (
          <div className="plz-ausserhalb-box">
            <div className="plz-ausserhalb-icon">📍</div>
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
