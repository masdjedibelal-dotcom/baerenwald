"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";

import { CookieConsentPanel } from "@/components/consent/CookieConsentPanel";
import {
  readCookieConsent,
  writeCookieConsent,
} from "@/lib/consent/cookie-consent";
import {
  initPostHogClient,
  optOutPostHogClient,
} from "@/lib/consent/posthog-client";
import {
  meldeDatenschutzUrl,
  meldeImpressumUrl,
} from "@/lib/org/melde-legal-urls";

type LegalLinks = { datenschutz: string; impressum: string };

type CookieConsentContextValue = {
  openSettings: () => void;
  statisticsEnabled: boolean;
  /** Org-Rechtstexte für Whitelabel-Melde (Cookie-Banner). */
  setLegalLinks: (links: LegalLinks | null) => void;
};

const CookieConsentContext = createContext<CookieConsentContextValue | null>(
  null
);

const DEFAULT_LEGAL: LegalLinks = {
  datenschutz: "/datenschutz#cookies-tracking",
  impressum: "/impressum",
};

/** /melden/{org}/… → Org-Rechtstexte; status/fehler/… ausgenommen. */
function legalFromMeldePath(pathname: string | null): LegalLinks | null {
  if (!pathname?.startsWith("/melden/")) return null;
  const seg = pathname.split("/").filter(Boolean);
  // melden / {slug} / …
  const slug = seg[1];
  if (!slug) return null;
  const reserved = new Set([
    "status",
    "fehler",
    "bestaetigung",
    "ergaenzen",
    "datenschutz",
    "impressum",
  ]);
  if (reserved.has(slug)) return null;
  return {
    datenschutz: meldeDatenschutzUrl(slug),
    impressum: meldeImpressumUrl(slug),
  };
}

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
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [statisticsDraft, setStatisticsDraft] = useState(false);
  const [statisticsEnabled, setStatisticsEnabled] = useState(false);
  const [overrideLegal, setOverrideLegal] = useState<LegalLinks | null>(null);

  const pathLegal = useMemo(() => legalFromMeldePath(pathname), [pathname]);
  const legal = overrideLegal ?? pathLegal ?? DEFAULT_LEGAL;

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

  const setLegalLinks = useCallback((links: LegalLinks | null) => {
    setOverrideLegal(links);
  }, []);

  const value = useMemo(
    () => ({ openSettings, statisticsEnabled, setLegalLinks }),
    [openSettings, statisticsEnabled, setLegalLinks]
  );

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
      {hydrated && showBanner ? (
        <CookieConsentPanel
          mode="banner"
          datenschutzHref={legal.datenschutz}
          impressumHref={legal.impressum}
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
            datenschutzHref={legal.datenschutz}
            impressumHref={legal.impressum}
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
