/**
 * Zentrale PostHog-Env (Client + Server).
 * Neu: NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN + NEXT_PUBLIC_POSTHOG_HOST
 * Legacy: NEXT_PUBLIC_POSTHOG_KEY (Token)
 */

export function getPostHogProjectToken(): string | undefined {
  const t =
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim() ||
    process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  return t || undefined;
}

/** API-Host (EU Cloud), z. B. https://eu.i.posthog.com */
export function getPostHogHost(): string {
  return (
    process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() ||
    "https://eu.i.posthog.com"
  );
}
