"use client";

import { useEffect } from "react";

import type { Situation as LegacySituation } from "@/lib/types";
import type { Situation as BwSituation } from "@/lib/funnel/types";
import { cn } from "@/lib/utils";

const SUBTITLES_LEGACY: Partial<Record<LegacySituation, string>> = {
  renovierung: "Wir kalkulieren Maler, Boden und deine Leistungen…",
  neubau: "Wir prüfen Ausbau-Pakete und aktuelle Preise…",
  akut: "Wir prüfen Verfügbarkeit und Stundenpreise…",
  pflege: "Wir berechnen dein Abo-Paket…",
  b2b: "Wir erstellen deinen Rahmenvertrag-Richtwert…",
};

const SUBTITLES_BW: Partial<Record<BwSituation, string>> = {
  renovieren: "Wir kalkulieren deine Leistungen und Flächen…",
  sanieren: "Wir summieren Sanierung und Förderoptionen…",
  notfall: "Wir prüfen Verfügbarkeit und Einsatzrahmen…",
  neubauen: "Wir schätzen Ausbau und Außenarbeiten…",
  betreuung: "Wir berechnen Pflege- und Servicepakete…",
};

export interface LoadingScreenProps {
  situation: LegacySituation | BwSituation | null;
  onComplete: () => void;
  durationMs?: number;
  className?: string;
}

export function LoadingScreen({
  situation,
  onComplete,
  durationMs = 2200,
  className,
}: LoadingScreenProps) {
  useEffect(() => {
    const t = window.setTimeout(() => onComplete(), durationMs);
    return () => window.clearTimeout(t);
  }, [onComplete, durationMs]);

  const sub =
    situation && SUBTITLES_BW[situation as BwSituation]
      ? SUBTITLES_BW[situation as BwSituation]
      : situation && SUBTITLES_LEGACY[situation as LegacySituation]
        ? SUBTITLES_LEGACY[situation as LegacySituation]
        : "Wir bereiten dein Ergebnis vor …";

  return (
    <div
      className={cn(
        "flex flex-col items-center px-6 py-16 text-center",
        className
      )}
    >
      <div className="text-funnel-accent" aria-hidden>
        <svg
          className="size-12 animate-funnel-spin"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            fill="currentColor"
            d="M12 2a10 10 0 0110 10h-3a7 7 0 00-7-7V2z"
          />
        </svg>
      </div>
      <h2 className="mt-4 text-lg font-semibold text-text-primary">
        Dein Preisrahmen wird berechnet…
      </h2>
      <p className="mt-2 max-w-sm text-sm text-text-secondary">{sub}</p>
      <div className="mt-6 flex gap-1.5" aria-hidden>
        <span className="size-1.5 rounded-full bg-funnel-accent [animation:pulse_1.2s_ease-in-out_infinite]" />
        <span className="size-1.5 rounded-full bg-funnel-accent [animation:pulse_1.2s_ease-in-out_infinite] [animation-delay:0.2s]" />
        <span className="size-1.5 rounded-full bg-funnel-accent [animation:pulse_1.2s_ease-in-out_infinite] [animation-delay:0.4s]" />
      </div>
    </div>
  );
}
