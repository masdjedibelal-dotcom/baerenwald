import posthog from "posthog-js";

import { hasStatisticsConsent } from "@/lib/consent/cookie-consent";
import { getPostHogHost, getPostHogProjectToken } from "@/lib/posthog-env";

let initialized = false;

export function isPostHogInitialized(): boolean {
  return initialized;
}

export function initPostHogClient(): boolean {
  if (initialized) return true;
  if (!hasStatisticsConsent()) return false;

  const token = getPostHogProjectToken();
  if (!token) return false;

  posthog.init(token, {
    api_host: getPostHogHost(),
    ui_host:
      process.env.NEXT_PUBLIC_POSTHOG_UI_HOST?.trim() || "https://eu.posthog.com",
    defaults: "2026-01-30",
    capture_exceptions: true,
    debug: process.env.NODE_ENV === "development",
  });

  initialized = true;
  return true;
}

export function optOutPostHogClient(): void {
  if (!initialized) return;
  try {
    posthog.opt_out_capturing();
  } catch {
    /* ignore */
  }
}

export function capturePostHogEvent(
  event: string,
  props?: Record<string, string | number | boolean | undefined>
): void {
  if (!hasStatisticsConsent() || !initialized) return;
  try {
    posthog.capture(event, props);
  } catch {
    /* ignore */
  }
}
