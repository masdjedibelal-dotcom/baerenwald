"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { CookieConsentPanel } from "@/components/consent/CookieConsentPanel";
import {
  readCookieConsent,
  writeCookieConsent,
} from "@/lib/consent/cookie-consent";
import {
  initPostHogClient,
  optOutPostHogClient,
} from "@/lib/consent/posthog-client";

type CookieConsentContextValue = {
  openSettings: () => void;
  statisticsEnabled: boolean;
};

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

export function useCookieConsent(): CookieConsentContextValue {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) {
    throw new Error("useCookieConsent must be used within CookieConsentProvider");
  }
  return ctx;
}

export function CookieConsentProvider({
  children,
  onStatisticsChange,
}: {
  children: React.ReactNode;
  onStatisticsChange: (enabled: boolean) => void;
}) {
  const [hydrated, setHydrated] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [statisticsDraft, setStatisticsDraft] = useState(false);
  const [statisticsEnabled, setStatisticsEnabled] = useState(false);

  useEffect(() => {
    const stored = readCookieConsent();
    if (stored) {
      setStatisticsEnabled(stored.statistics);
      setStatisticsDraft(stored.statistics);
      if (stored.statistics) initPostHogClient();
      onStatisticsChange(stored.statistics);
    } else {
      setShowBanner(true);
    }
    setHydrated(true);
  }, [onStatisticsChange]);

  const applyStatistics = useCallback(
    (enabled: boolean) => {
      writeCookieConsent(enabled);
      if (enabled) {
        initPostHogClient();
      } else {
        optOutPostHogClient();
      }
      setStatisticsEnabled(enabled);
      setStatisticsDraft(enabled);
      onStatisticsChange(enabled);
    },
    [onStatisticsChange]
  );

  const acceptStatistics = useCallback(() => {
    applyStatistics(true);
    setShowBanner(false);
    setShowSettings(false);
  }, [applyStatistics]);

  const acceptNecessaryOnly = useCallback(() => {
    applyStatistics(false);
    setShowBanner(false);
    setShowSettings(false);
  }, [applyStatistics]);

  const saveSettings = useCallback(() => {
    applyStatistics(statisticsDraft);
    setShowSettings(false);
  }, [applyStatistics, statisticsDraft]);

  const openSettings = useCallback(() => {
    const stored = readCookieConsent();
    setStatisticsDraft(stored?.statistics ?? false);
    setShowSettings(true);
  }, []);

  const value = useMemo(
    () => ({ openSettings, statisticsEnabled }),
    [openSettings, statisticsEnabled]
  );

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
      {hydrated && showBanner ? (
        <CookieConsentPanel
          mode="banner"
          onAcceptStatistics={acceptStatistics}
          onNecessaryOnly={acceptNecessaryOnly}
        />
      ) : null}
      {hydrated && showSettings ? (
        <>
          <button
            type="button"
            className="cookie-consent-backdrop"
            aria-label="Cookie-Einstellungen schließen"
            onClick={() => setShowSettings(false)}
          />
          <CookieConsentPanel
            mode="settings"
            statisticsDraft={statisticsDraft}
            onStatisticsDraftChange={setStatisticsDraft}
            onSave={saveSettings}
            onNecessaryOnly={acceptNecessaryOnly}
            onAcceptStatistics={acceptStatistics}
            onClose={() => setShowSettings(false)}
          />
        </>
      ) : null}
    </CookieConsentContext.Provider>
  );
}
