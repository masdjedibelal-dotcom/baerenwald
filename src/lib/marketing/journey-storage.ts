import type {
  JourneyClick,
  JourneyPageView,
  MarketingJourney,
  MarketingUtm,
} from "@/lib/marketing/journey-types";

const STORAGE_KEY = "bw_marketing_journey_v1";
const MAX_PAGES = 24;
const MAX_CLICKS = 40;

function nowIso(): string {
  return new Date().toISOString();
}

function readUtmFromLocation(): MarketingUtm {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  const utm: MarketingUtm = {};
  const source = p.get("utm_source")?.trim();
  const medium = p.get("utm_medium")?.trim();
  const campaign = p.get("utm_campaign")?.trim();
  const term = p.get("utm_term")?.trim();
  const content = p.get("utm_content")?.trim();
  if (source) utm.source = source;
  if (medium) utm.medium = medium;
  if (campaign) utm.campaign = campaign;
  if (term) utm.term = term;
  if (content) utm.content = content;
  return utm;
}

function emptyJourney(): MarketingJourney {
  const path =
    typeof window !== "undefined" ? window.location.pathname : "/";
  return {
    startedAt: nowIso(),
    landingPath: path,
    referrer:
      typeof document !== "undefined" ? document.referrer?.trim() || null : null,
    utm: readUtmFromLocation(),
    pages: [],
    clicks: [],
  };
}

function load(): MarketingJourney | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MarketingJourney;
  } catch {
    return null;
  }
}

function save(j: MarketingJourney): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(j));
  } catch {
    /* quota */
  }
}

/** Beim ersten Seitenaufruf der Session initialisieren. */
export function ensureMarketingJourney(): MarketingJourney {
  const existing = load();
  if (existing) return existing;
  const j = emptyJourney();
  save(j);
  return j;
}

export function recordMarketingPageView(path: string): void {
  if (!path || typeof window === "undefined") return;
  const j = ensureMarketingJourney();
  const last = j.pages[j.pages.length - 1];
  if (last?.path === path) return;
  const pages: JourneyPageView[] = [
    ...j.pages,
    { path, at: nowIso() },
  ].slice(-MAX_PAGES);
  save({ ...j, pages });
}

export function recordMarketingClick(
  type: string,
  label: string,
  href?: string
): void {
  if (typeof window === "undefined") return;
  const j = ensureMarketingJourney();
  const click: JourneyClick = {
    type,
    label: label.trim().slice(0, 120),
    href: href?.trim().slice(0, 200),
    at: nowIso(),
  };
  const clicks = [...j.clicks, click].slice(-MAX_CLICKS);
  save({ ...j, clicks });
}

export function setMarketingEntryLeistung(leistung: string): void {
  const v = leistung.trim();
  if (!v || typeof window === "undefined") return;
  const j = ensureMarketingJourney();
  if (j.entryLeistung) return;
  save({ ...j, entryLeistung: v });
}

export function getMarketingJourneySnapshot(): MarketingJourney | null {
  const j = load();
  if (!j) return null;
  return j;
}

/** Nach erfolgreichem Lead optional leeren (neue Session). */
export function clearMarketingJourney(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
