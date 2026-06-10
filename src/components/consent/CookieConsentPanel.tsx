"use client";

import Link from "next/link";

import "./cookie-consent.css";
import { cn } from "@/lib/utils";

export function CookieConsentPanel({
  mode,
  statisticsDraft = false,
  onStatisticsDraftChange,
  onAcceptStatistics,
  onNecessaryOnly,
  onSave,
  onClose,
}: {
  mode: "banner" | "settings";
  statisticsDraft?: boolean;
  onStatisticsDraftChange?: (value: boolean) => void;
  onAcceptStatistics: () => void;
  onNecessaryOnly: () => void;
  onSave?: () => void;
  onClose?: () => void;
}) {
  const isSettings = mode === "settings";

  return (
    <div
      className={cn(
        "cookie-consent-banner",
        isSettings && "cookie-consent-banner--settings"
      )}
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
      aria-modal={isSettings}
    >
      <div className="cookie-consent-inner">
        <div className="cookie-consent-copy">
          <p id="cookie-consent-title" className="cookie-consent-title">
            {isSettings ? "Cookie-Einstellungen" : "Cookies & Datenschutz"}
          </p>
          <p id="cookie-consent-desc" className="cookie-consent-text">
            {isSettings ? (
              <>
                Passe deine Auswahl an. Technisch notwendige Speicher sind für Login und
                den Rechner-Betrieb erforderlich und können nicht abgewählt werden.
              </>
            ) : (
              <>
                Wir verwenden <strong>technisch notwendige</strong> Speicher (z. B. für
                Login im Kunden- und Partner-Portal). Mit deiner Einwilligung nutzen wir
                zusätzlich <strong>Statistik</strong> (PostHog, EU), um unsere Website zu
                verbessern.
              </>
            )}
          </p>

          {isSettings ? (
            <div className="cookie-consent-toggles">
              <label className="cookie-consent-toggle cookie-consent-toggle--disabled">
                <input type="checkbox" checked disabled readOnly />
                <span>
                  <strong>Notwendig</strong>
                  <span className="cookie-consent-toggle-hint">
                    Session &amp; Portal-Login
                  </span>
                </span>
              </label>
              <label className="cookie-consent-toggle">
                <input
                  type="checkbox"
                  checked={statisticsDraft}
                  onChange={(e) => onStatisticsDraftChange?.(e.target.checked)}
                />
                <span>
                  <strong>Statistik</strong>
                  <span className="cookie-consent-toggle-hint">
                    PostHog (EU) — anonyme Nutzungsanalyse
                  </span>
                </span>
              </label>
            </div>
          ) : null}

          <nav className="cookie-consent-links" aria-label="Rechtliches">
            <Link href="/datenschutz#cookies-tracking">Datenschutz</Link>
            <span aria-hidden>·</span>
            <Link href="/impressum">Impressum</Link>
          </nav>
        </div>

        <div className="cookie-consent-actions">
          {isSettings ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="cookie-consent-btn cookie-consent-btn--ghost"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={onNecessaryOnly}
                className="cookie-consent-btn cookie-consent-btn--outline"
              >
                Nur notwendige
              </button>
              <button
                type="button"
                onClick={onSave}
                className="cookie-consent-btn cookie-consent-btn--primary"
              >
                Speichern
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onNecessaryOnly}
                className="cookie-consent-btn cookie-consent-btn--ghost"
              >
                Nur notwendige
              </button>
              <button
                type="button"
                onClick={onNecessaryOnly}
                className="cookie-consent-btn cookie-consent-btn--outline"
              >
                Ablehnen
              </button>
              <button
                type="button"
                onClick={onAcceptStatistics}
                className="cookie-consent-btn cookie-consent-btn--primary"
              >
                Akzeptieren
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
