export const COOKIE_CONSENT_STORAGE_KEY = "bw_cookie_consent_v1";
export const COOKIE_CONSENT_VERSION = 1;

export type CookieConsentChoice = {
  version: number;
  necessary: true;
  statistics: boolean;
  decidedAt: string;
};

export function readCookieConsent(): CookieConsentChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsentChoice;
    if (parsed.version !== COOKIE_CONSENT_VERSION) return null;
    if (parsed.necessary !== true) return null;
    if (typeof parsed.statistics !== "boolean") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCookieConsent(statistics: boolean): CookieConsentChoice {
  const choice: CookieConsentChoice = {
    version: COOKIE_CONSENT_VERSION,
    necessary: true,
    statistics,
    decidedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(choice));
  }
  return choice;
}

export function hasConsentDecision(): boolean {
  return readCookieConsent() !== null;
}

export function hasStatisticsConsent(): boolean {
  return readCookieConsent()?.statistics === true;
}
