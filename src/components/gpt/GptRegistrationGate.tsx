"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  formatRetryCountdown,
  limitAllowsRetryWithoutRegister,
  type GptRegistrationGateState,
} from "@/lib/gpt-viz/registration-gate";

type GptRegistrationGateProps = {
  gate: GptRegistrationGateState;
  onExpired: () => void;
};

export function GptRegistrationGate({ gate, onExpired }: GptRegistrationGateProps) {
  const [remainingMs, setRemainingMs] = useState(() => calcRemaining(gate.retryAfter));

  useEffect(() => {
    if (!gate.retryAfter || !limitAllowsRetryWithoutRegister(gate.limitCode)) return;

    const tick = () => {
      const next = calcRemaining(gate.retryAfter);
      setRemainingMs(next);
      if (next <= 0) onExpired();
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [gate.retryAfter, gate.limitCode, onExpired]);

  const showTimer =
    gate.retryAfter &&
    limitAllowsRetryWithoutRegister(gate.limitCode) &&
    remainingMs > 0;

  return (
    <div
      className="gpt-registration-gate"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="gpt-registration-gate-title"
      aria-describedby="gpt-registration-gate-desc"
    >
      <div className="gpt-registration-gate-card">
        <p id="gpt-registration-gate-title" className="gpt-registration-gate-kicker">
          Weiter im Portal
        </p>
        <p id="gpt-registration-gate-desc" className="gpt-registration-gate-text">
          {gate.message}
        </p>

        {showTimer ? (
          <div className="gpt-registration-gate-timer" aria-live="polite">
            <span className="gpt-registration-gate-timer-label">
              Ohne Anmeldung geht es weiter in
            </span>
            <span className="gpt-registration-gate-timer-value">
              {formatRetryCountdown(remainingMs)}
            </span>
          </div>
        ) : (
          <p className="gpt-registration-gate-hint">
            Ohne Registrierung kannst du hier leider nicht weitermachen.
          </p>
        )}

        <Link href={gate.portalRegisterUrl} className="gpt-registration-gate-btn">
          Kostenlos registrieren
        </Link>
      </div>
    </div>
  );
}

function calcRemaining(retryAfter: string | null): number {
  if (!retryAfter) return 0;
  return Math.max(0, new Date(retryAfter).getTime() - Date.now());
}
