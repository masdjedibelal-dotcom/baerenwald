import { PostHog } from "posthog-node";

import { getPostHogHost, getPostHogProjectToken } from "@/lib/posthog-env";

let posthogClient: PostHog | null = null;

/**
 * Singleton für API-Routen. Ohne Token: `null` (kein Capture).
 * Bei Bedarf nach Events `await client.shutdown()` — hier bewusst Singleton ohne Shutdown pro Request (Flush über flushAt).
 */
export function getPostHogClient(): PostHog | null {
  const key = getPostHogProjectToken();
  if (!key) return null;

  if (!posthogClient) {
    posthogClient = new PostHog(key, {
      host: getPostHogHost(),
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return posthogClient;
}
