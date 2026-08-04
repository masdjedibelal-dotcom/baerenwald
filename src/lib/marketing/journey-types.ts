/** Session-Marketing-Daten (sessionStorage) — wird beim Lead mitgeschickt. */

export type JourneyPageView = {
  path: string;
  at: string;
};

export type JourneyClick = {
  type: string;
  label: string;
  href?: string;
  at: string;
};

export type MarketingUtm = {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
};

export type MarketingJourney = {
  startedAt: string;
  landingPath: string;
  referrer: string | null;
  utm: MarketingUtm;
  pages: JourneyPageView[];
  clicks: JourneyClick[];
  /** Erster Rechner-Einstieg mit ?leistung= / ?gewerk= */
  entryLeistung?: string;
};
