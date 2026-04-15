"use client";

import { useEffect, useState } from "react";

import type { Situation as BwSituation } from "@/lib/funnel/types";

export interface LoadingScreenProps {
  situation: BwSituation | string | null;
  onComplete: () => void;
  className?: string;
}

export function LoadingScreen({ onComplete, className }: LoadingScreenProps) {
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
    { text: "Dein Preisrahmen wird erstellt…" },
  ];

  return (
    <div className={`loading-screen${className ? ` ${className}` : ""}`}>
      <div className="loading-icon" aria-hidden>
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          style={{
            color: "var(--fl-accent)",
            animation: "pulse 1.2s ease-in-out infinite",
          }}
        >
          <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="3"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M8 8h2v2H8zM11 8h5M11 11h5M8 12h2v2H8zM8 16h8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div className="loading-steps">
        {steps.map((s, i) => {
          const idx = i + 1;
          const cls =
            step > idx
              ? "loading-step done"
              : step === idx
                ? "loading-step active"
                : "loading-step";
          return (
            <div key={s.text} className={cls}>
              <div className="loading-step-dot" />
              <span>{s.text}</span>
            </div>
          );
        })}
      </div>

      <p className="loading-sub">Basierend auf aktuellen Preisen für München 2026</p>
    </div>
  );
}
