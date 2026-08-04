"use client";

import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { Suspense, useCallback, useMemo, useState } from "react";

import { AuthRecoveryRedirect } from "@/components/auth/AuthRecoveryRedirect";
import { CookieConsentProvider } from "@/components/consent/CookieConsentContext";
import { MarketingJourneyTracker } from "@/components/marketing/MarketingJourneyTracker";
import { isPostHogInitialized } from "@/lib/consent/posthog-client";
import { getPostHogProjectToken } from "@/lib/posthog-env";

export function PHProvider({ children }: { children: React.ReactNode }) {
  const hasToken = useMemo(() => Boolean(getPostHogProjectToken()), []);
  const [statisticsEnabled, setStatisticsEnabled] = useState(false);

  const onStatisticsChange = useCallback((enabled: boolean) => {
    setStatisticsEnabled(enabled);
  }, []);

  const content = (
    <CookieConsentProvider onStatisticsChange={onStatisticsChange}>
      <Suspense fallback={null}>
        <AuthRecoveryRedirect />
      </Suspense>
      <MarketingJourneyTracker />
      {children}
    </CookieConsentProvider>
  );

  if (!hasToken) {
    return content;
  }

  if (statisticsEnabled && isPostHogInitialized()) {
    return <PostHogProvider client={posthog}>{content}</PostHogProvider>;
  }

  return content;
}
