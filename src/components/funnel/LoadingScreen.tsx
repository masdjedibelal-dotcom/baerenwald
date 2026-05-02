"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import type { Situation as BwSituation } from "@/lib/funnel/types";
import { cn } from "@/lib/utils";

export interface LoadingScreenProps {
  /** Optional — für künftige Textvarianten; aktuell ungenutzt. */
  situation?: BwSituation | string | null;
  onComplete: () => void;
  className?: string;
}

export function LoadingScreen({
  onComplete,
  className,
}: LoadingScreenProps) {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);

  useEffect(() => {
    const t1 = window.setTimeout(() => setStep(1), 700);
    const t2 = window.setTimeout(() => setStep(2), 1500);
    const t3 = window.setTimeout(() => setStep(3), 2300);
    const t4 = window.setTimeout(() => onComplete(), 2800);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearTimeout(t4);
    };
  }, [onComplete]);

  const steps: { text: string }[] = [
    { text: "Münchner Marktpreise werden berechnet…" },
    { text: "Dein Projekt wird eingeordnet…" },
    { text: "Dein unverbindlicher Preisrahmen wird erstellt…" },
  ];

  return (
    <div className={cn("loading-screen", className)}>
      <div
        className="loading-screen-card"
        role="status"
        aria-busy="true"
        aria-live="polite"
        aria-label="Unverbindlicher Preisrahmen wird berechnet"
      >
        <p className="loading-screen-kicker">Einen Moment</p>
        <h2 className="loading-screen-title">
          Dein unverbindlicher Preisrahmen entsteht
        </h2>

        <div className="loading-screen-icon-wrap" aria-hidden>
          <div className="loading-screen-ring" />
          <div className="loading-screen-icon-inner">
            <Loader2
              className="loading-screen-spinner"
              strokeWidth={2}
              size={28}
              aria-hidden
            />
          </div>
        </div>

        <div className="loading-progress" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                "loading-progress-seg",
                step > i && "loading-progress-seg--fill"
              )}
            />
          ))}
        </div>

        <ol className="loading-steps">
          {steps.map((s, i) => {
            const idx = i + 1;
            const cls =
              step > idx
                ? "loading-step done"
                : step === idx
                  ? "loading-step active"
                  : "loading-step";
            return (
              <li key={s.text} className={cls}>
                <span className="loading-step-dot" />
                <span className="loading-step-text">{s.text}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <p className="loading-sub">
        Basierend auf aktuellen Preisen für München 2026
      </p>
    </div>
  );
}
