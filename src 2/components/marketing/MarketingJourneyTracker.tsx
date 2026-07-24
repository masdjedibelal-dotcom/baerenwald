"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import {
  ensureMarketingJourney,
  recordMarketingPageView,
  setMarketingEntryLeistung,
} from "@/lib/marketing/journey-storage";

function MarketingJourneyTrackerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    ensureMarketingJourney();
  }, []);

  useEffect(() => {
    if (pathname) recordMarketingPageView(pathname);
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/portal-tools/rechner") return;
    const leistung =
      searchParams.get("leistung")?.trim() ||
      searchParams.get("gewerk")?.trim();
    if (leistung) setMarketingEntryLeistung(leistung);
  }, [pathname, searchParams]);

  return null;
}

/** Erfasst Seitenaufrufe und Rechner-Einstieg in der Session. */
export function MarketingJourneyTracker() {
  return (
    <Suspense fallback={null}>
      <MarketingJourneyTrackerInner />
    </Suspense>
  );
}
