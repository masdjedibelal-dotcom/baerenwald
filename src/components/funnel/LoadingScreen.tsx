"use client";

import { useEffect } from "react";

import type { Situation } from "@/lib/types";
import { cn } from "@/lib/utils";

const SUBTITLES: Record<Situation, string> = {
  renovierung: "Wir kalkulieren Maler, Boden und deine Gewerke…",
  neubau: "Wir prüfen Ausbau-Pakete und aktuelle Preise…",
  akut: "Wir prüfen Verfügbarkeit und Stundenpreise…",
  pflege: "Wir berechnen dein Abo-Paket…",
  b2b: "Wir erstellen deinen Rahmenvertrag-Richtwert…",
};

export interface LoadingScreenProps {
  situation: Situation | null;
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
    situation && SUBTITLES[situation]
      ? SUBTITLES[situation]
      : "Wir bereiten dein Ergebnis vor …";

  return (
    <div
      className={cn(
        "fade-in flex flex-col items-center px-[18px] py-12 text-center",
        className
      )}
    >
      <div
        className="flex size-12 items-center justify-center rounded-full bg-[#f0f0f0]"
        aria-hidden
      >
        <svg
          className="size-6 animate-funnel-spin text-funnel-accent"
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
      <h2 className="mt-6 text-lg font-semibold text-text-primary">
        Dein Preisrahmen wird berechnet…
      </h2>
      <p className="mt-2 max-w-sm text-[13px] leading-normal text-[#666]">
        {sub}
      </p>
      <div className="mt-6 flex gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 rounded-full bg-funnel-accent funnel-dot-pulse"
            style={{ animationDelay: `${i * 0.3}s` }}
          />
        ))}
      </div>
    </div>
  );
}
