"use client";

import { useEffect, useState } from "react";

import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { portalToastSuccess } from "@/lib/shared/portal-toast";
import { cn } from "@/lib/utils";

/**
 * E2 — Tracking / ATT / Analytics-Consent (Settings-Stub).
 *
 * Native App (Capacitor o.ä.): ATT-Prompt vor IDFA; Web/PWA: Opt-in für
 * Analyse (PostHog). Privacy Nutrition Labels: Analytics optional.
 */
export const PORTAL_TRACKING_CONSENT_KEY = "portal_tracking_consent_v1";

export type TrackingConsentValue = "unset" | "accepted" | "declined";

export function readTrackingConsent(): TrackingConsentValue {
  if (typeof window === "undefined") return "unset";
  try {
    const v = window.localStorage.getItem(PORTAL_TRACKING_CONSENT_KEY);
    if (v === "accepted" || v === "declined") return v;
  } catch {
    /* ignore */
  }
  return "unset";
}

export function writeTrackingConsent(value: Exclude<TrackingConsentValue, "unset">) {
  try {
    window.localStorage.setItem(PORTAL_TRACKING_CONSENT_KEY, value);
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("portal-tracking-consent", { detail: value })
    );
  }
}

type Props = {
  className?: string;
};

/**
 * Einstellungen-Block: Analyse/Tracking Opt-in + Hinweis ATT (iOS).
 */
export function PortalTrackingConsentPanel({ className }: Props) {
  const [value, setValue] = useState<TrackingConsentValue>("unset");

  useEffect(() => {
    setValue(readTrackingConsent());
  }, []);

  function setConsent(next: Exclude<TrackingConsentValue, "unset">) {
    writeTrackingConsent(next);
    setValue(next);
    portalToastSuccess(
      next === "accepted"
        ? "Analyse aktiviert — hilft uns, das Portal zu verbessern."
        : "Analyse deaktiviert."
    );
  }

  return (
    <div
      className={cn("rounded-xl border bg-white p-4", className)}
      style={{ borderColor: PORTAL_VAR.line }}
      data-testid="tracking-consent-panel"
    >
      <p
        className="text-[14px] font-bold"
        style={{
          color: PORTAL_VAR.ink,
          fontFamily: "var(--p2-font-head, " + PORTAL_VAR.head + ")",
        }}
      >
        Analyse & Datenschutz
      </p>
      <p className="mt-1.5 text-[12.5px] leading-relaxed" style={{ color: PORTAL_VAR.sub }}>
        Wir nutzen optionale Nutzungsanalyse (z.&nbsp;B. PostHog), um Fehler und
        Bedienung zu verbessern. Keine Weitergabe zu Werbezwecken. In der iOS-App
        erscheint ggf. der System-Dialog „App-Tracking“ (ATT) — Ihre Wahl gilt
        dort zusätzlich.
      </p>
      <p className="mt-2 text-[11.5px]" style={{ color: PORTAL_VAR.faint }}>
        Status:{" "}
        {value === "accepted"
          ? "Analyse erlaubt"
          : value === "declined"
            ? "Analyse aus"
            : "Noch nicht festgelegt"}
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          className="rounded-[9px] px-4 py-2.5 text-[13px] font-semibold text-white"
          style={{ background: PORTAL_VAR.primary }}
          onClick={() => setConsent("accepted")}
        >
          Analyse erlauben
        </button>
        <button
          type="button"
          className="rounded-[9px] border bg-white px-4 py-2.5 text-[13px] font-semibold"
          style={{ borderColor: PORTAL_VAR.line, color: PORTAL_VAR.sub }}
          onClick={() => setConsent("declined")}
        >
          Ablehnen
        </button>
      </div>
    </div>
  );
}
