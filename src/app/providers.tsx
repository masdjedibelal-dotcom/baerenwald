"use client";

import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { useEffect, useMemo } from "react";

import { getPostHogHost, getPostHogProjectToken } from "@/lib/posthog-env";

/**
 * PostHog im Browser (Next.js 14 App Router).
 * Ab Next 15.3+ alternativ `instrumentation-client.ts` möglich — Provider bleibt mit Next 14 kompatibel.
 */
export function PHProvider({ children }: { children: React.ReactNode }) {
  const hasToken = useMemo(() => Boolean(getPostHogProjectToken()), []);

  useEffect(() => {
    const token = getPostHogProjectToken();
    if (!token) return;

    posthog.init(token, {
      api_host: getPostHogHost(),
      ui_host:
        process.env.NEXT_PUBLIC_POSTHOG_UI_HOST?.trim() ||
        "https://eu.posthog.com",
      defaults: "2026-01-30",
      capture_exceptions: true,
      debug: process.env.NODE_ENV === "development",
    });
  }, []);

  if (!hasToken) {
    return <>{children}</>;
  }

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
